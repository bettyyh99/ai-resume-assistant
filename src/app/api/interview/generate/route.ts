import { NextRequest } from 'next/server';
import {
  createLLMClient,
  extractJson,
  invokeLLM,
  sseResponse,
} from '@/server/llm-client';
import { buildInterviewMessages } from '@/server/prompts';
import type { InterviewPrep, TargetJob, UserProfile } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface GenerateBody {
  profile?: UserProfile;
  job?: TargetJob;
}

function hasUsableContent(profile: UserProfile): boolean {
  return Boolean(
    profile.summary.trim() ||
      profile.skills.trim() ||
      profile.workExperiences.some(
        (w) =>
          w.company.trim() ||
          w.responsibilities.trim() ||
          w.achievements.trim(),
      ) ||
      profile.projects.some((p) => p.name.trim() || p.description.trim()),
  );
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizePrep(raw: unknown): InterviewPrep {
  const fallback: InterviewPrep = {
    overview: '',
    questions: [],
    skillGaps: [],
    preparationPoints: [],
  };
  if (typeof raw !== 'object' || raw === null) return fallback;
  const obj = raw as Record<string, unknown>;
  const questions = Array.isArray(obj.questions) ? obj.questions : [];
  const gaps = Array.isArray(obj.skillGaps) ? obj.skillGaps : [];
  const points = Array.isArray(obj.preparationPoints) ? obj.preparationPoints : [];

  return {
    overview: asString(obj.overview),
    questions: questions
      .map((q): InterviewPrep['questions'][number] | null => {
        if (typeof q !== 'object' || q === null) return null;
        const item = q as Record<string, unknown>;
        const star =
          typeof item.star === 'object' && item.star !== null
            ? (item.star as Record<string, unknown>)
            : {};
        return {
          question: asString(item.question),
          category: asString(item.category) || '行为面试',
          star: {
            situation: asString(star.situation),
            task: asString(star.task),
            action: asString(star.action),
            result: asString(star.result),
          },
          tips: asString(item.tips),
        };
      })
      .filter(
        (q): q is InterviewPrep['questions'][number] =>
          q !== null && q.question.length > 0,
      ),
    skillGaps: gaps
      .map((g): InterviewPrep['skillGaps'][number] | null => {
        if (typeof g !== 'object' || g === null) return null;
        const item = g as Record<string, unknown>;
        const level = ['high', 'medium', 'low'].includes(asString(item.level))
          ? (asString(item.level) as 'high' | 'medium' | 'low')
          : 'medium';
        return {
          skill: asString(item.skill),
          level,
          reason: asString(item.reason),
          advice: asString(item.advice),
        };
      })
      .filter(
        (g): g is InterviewPrep['skillGaps'][number] =>
          g !== null && g.skill.length > 0,
      ),
    preparationPoints: points.map(asString).filter((s) => s.trim().length > 0),
  };
}

export async function POST(request: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return new Response(JSON.stringify({ error: '请求参数格式错误。' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profile = body.profile;
  const job = body.job;
  if (!profile || !job || !job.title.trim()) {
    return new Response(
      JSON.stringify({ error: '请先完善经历信息并填写目标岗位名称。' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (!hasUsableContent(profile)) {
    return new Response(
      JSON.stringify({ error: '请至少填写一段工作经历、项目经历或技能简介。' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { system, user } = buildInterviewMessages(profile, job);
  const client = createLLMClient(request);

  return sseResponse(async (send) => {
    send({
      type: 'status',
      message: '正在对照 JD 与你的经历，梳理高频考点…',
    });

    const output = await invokeLLM(
      client,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.5 },
    );

    send({ type: 'status', message: '正在结合你的真实经历组织 STAR 回答框架…' });

    let prep: InterviewPrep;
    try {
      prep = normalizePrep(JSON.parse(extractJson(output)));
    } catch {
      prep = {
        overview: '',
        questions: [],
        skillGaps: [],
        preparationPoints: [],
      };
      // JSON 解析失败时，把原文作为概览兜底展示，避免吞掉真实调用结果
      prep.overview = output;
    }

    send({ type: 'data', payload: prep });
  });
}
