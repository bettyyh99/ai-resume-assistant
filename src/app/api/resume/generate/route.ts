import { NextRequest } from 'next/server';
import { sseResponse, streamLLM, createLLMClient } from '@/server/llm-client';
import { buildResumeMessages } from '@/server/prompts';
import type { TargetJob, UserProfile } from '@/lib/types';

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
          w.title.trim() ||
          w.responsibilities.trim() ||
          w.achievements.trim(),
      ) ||
      profile.projects.some((p) => p.name.trim() || p.description.trim()),
  );
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

  const { system, user } = buildResumeMessages(profile, job);
  const client = createLLMClient(request);

  return sseResponse(async (send) => {
    send({
      type: 'status',
      message: '正在研读你的经历与目标岗位 JD，提炼匹配关键词…',
    });

    let firstChunk = true;
    for await (const delta of streamLLM(
      client,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.55 },
    )) {
      if (firstChunk && delta.trim()) {
        send({
          type: 'status',
          message: '正在重写经历、按岗位相关度重组版块…',
        });
        firstChunk = false;
      }
      send({ type: 'delta', content: delta });
    }
  });
}
