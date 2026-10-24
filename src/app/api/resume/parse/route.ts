import { NextRequest, NextResponse } from 'next/server';
import {
  Config,
  FetchClient,
  HeaderUtils,
  S3Storage,
} from 'coze-coding-dev-sdk';
import { createLLMClient, extractJson, invokeLLM } from '@/server/llm-client';
import { buildParseMessages } from '@/server/prompts';
import type { ParseResult, UserProfile } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt']);
const CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

function emptyProfile(): UserProfile {
  return {
    name: '',
    targetTitle: '',
    phone: '',
    email: '',
    location: '',
    yearsOfExperience: '',
    summary: '',
    skills: '',
    certifications: '',
    languages: '',
    website: '',
    workExperiences: [],
    projects: [],
    educations: [],
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** 解析结果字段兜底，保证结构完整 */
function normalizeProfile(raw: unknown): UserProfile {
  const base = emptyProfile();
  if (typeof raw !== 'object' || raw === null) return base;
  const obj = raw as Record<string, unknown>;

  return {
    ...base,
    name: asString(obj.name),
    targetTitle: asString(obj.targetTitle),
    phone: asString(obj.phone),
    email: asString(obj.email),
    location: asString(obj.location),
    yearsOfExperience: asString(obj.yearsOfExperience),
    summary: asString(obj.summary),
    skills: asString(obj.skills),
    certifications: asString(obj.certifications),
    languages: asString(obj.languages),
    website: asString(obj.website),
    workExperiences: asArray<Record<string, unknown>>(obj.workExperiences).map(
      (w) => ({
        id: crypto.randomUUID(),
        company: asString(w.company),
        title: asString(w.title),
        startDate: asString(w.startDate),
        endDate: asString(w.endDate),
        current: Boolean(w.current),
        responsibilities: asString(w.responsibilities),
        achievements: asString(w.achievements),
        projects: asString(w.projects),
        skills: asString(w.skills),
      }),
    ),
    projects: asArray<Record<string, unknown>>(obj.projects).map((p) => ({
      id: crypto.randomUUID(),
      name: asString(p.name),
      role: asString(p.role),
      period: asString(p.period),
      description: asString(p.description),
      achievements: asString(p.achievements),
      technologies: asString(p.technologies),
    })),
    educations: asArray<Record<string, unknown>>(obj.educations).map((e) => ({
      id: crypto.randomUUID(),
      school: asString(e.school),
      degree: asString(e.degree),
      major: asString(e.major),
      startDate: asString(e.startDate),
      endDate: asString(e.endDate),
    })),
  };
}

/** 去掉 UTF-8 BOM */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 将原始文本交给 LLM 做结构化抽取 */
async function structureProfile(
  rawText: string,
  request: NextRequest,
): Promise<ParseResult> {
  const llm = createLLMClient(request);
  const { system, user } = buildParseMessages(rawText.slice(0, 24000));
  const modelOutput = await invokeLLM(
    llm,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.1 },
  );

  let profile: UserProfile;
  const warnings: string[] = [];
  try {
    profile = normalizeProfile(JSON.parse(extractJson(modelOutput)));
  } catch {
    warnings.push('结构化识别不完整，已为你保留原文，可在表单中手动校正。');
    profile = emptyProfile();
    profile.summary = rawText.slice(0, 2000);
  }

  if (
    !profile.name &&
    profile.workExperiences.length === 0 &&
    profile.projects.length === 0
  ) {
    warnings.push('未能可靠识别姓名与经历，请对照原文核对补全。');
  }

  return { profile, rawText, warnings };
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: '无法读取上传内容，请重新选择文件。' },
      { status: 400 },
    );
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: '请选择要上传的简历文件。' },
      { status: 400 },
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: '仅支持 PDF、Word（doc/docx）或 TXT 格式的简历。' },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: '文件内容为空。' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: '文件不能超过 10 MB，请压缩或删减后重试。' },
      { status: 400 },
    );
  }

  // TXT 文件无需文档解析服务，直接读取文本，节省一次外部解析调用
  if (ext === 'txt') {
    try {
      const rawText = stripBom(await file.text()).trim();
      if (!rawText) {
        return NextResponse.json(
          { error: '文件内容为空。' },
          { status: 400 },
        );
      }
      try {
        const result = await structureProfile(rawText.slice(0, 24000), request);
        return NextResponse.json(result);
      } catch (llmError) {
        // LLM 配额/临时不可用时降级：保留原文，用户可手动整理
        const profile = emptyProfile();
        profile.summary = rawText.slice(0, 2000);
        return NextResponse.json({
          profile,
          rawText,
          warnings: [
            `智能结构化暂不可用（${llmError instanceof Error ? llmError.message : '服务繁忙'}），已保留简历原文，请在表单中手动整理。`,
          ],
        } satisfies ParseResult);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '简历解析服务异常';
      return NextResponse.json(
        { error: `简历解析失败：${message}` },
        { status: 500 },
      );
    }
  }

  const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  let objectKey = '';

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // 对象存储文件名仅允许字母/数字/点/下划线/短横
    const safeName = `resume-parse/resume_${Date.now()}.${ext}`;

    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    objectKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: safeName,
      contentType: CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream',
    });

    const signedUrl = await storage.generatePresignedUrl({
      key: objectKey,
      expireTime: 600,
    });

    // 解析 PDF / Word / TXT 正文
    const fetchConfig = new Config();
    const fetchClient = new FetchClient(fetchConfig, forwardHeaders);
    const fetched = await fetchClient.fetch(signedUrl);

    if (fetched.status_code !== undefined && fetched.status_code !== 0) {
      return NextResponse.json(
        {
          error: `文档解析失败：${fetched.status_message ?? '未知错误'}，请确认文件未损坏或加密。`,
        },
        { status: 502 },
      );
    }

    const rawText = fetched.content
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text ?? '')
      .join('\n')
      .trim();

    if (!rawText) {
      return NextResponse.json(
        {
          error:
            '未能从文件中提取到文字，可能是扫描件/图片版 PDF。请改用在线表单填写，或上传可复制文字的简历文件。',
        },
        { status: 422 },
      );
    }

    // LLM 结构化抽取
    const result = await structureProfile(rawText, request);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '简历解析服务异常';
    return NextResponse.json(
      { error: `简历解析失败：${message}` },
      { status: 500 },
    );
  } finally {
    // 解析完成后清理临时文件
    if (objectKey) {
      try {
        const storage = new S3Storage({
          endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
          accessKey: '',
          secretKey: '',
          bucketName: process.env.COZE_BUCKET_NAME,
          region: 'cn-beijing',
        });
        await storage.deleteFile({ fileKey: objectKey });
      } catch {
        // 清理失败不影响主流程
      }
    }
  }
}
