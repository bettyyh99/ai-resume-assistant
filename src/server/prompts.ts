import 'server-only';
import type { TargetJob, UserProfile } from '@/lib/types';

/** 将结构化档案序列化为喂给模型的紧凑文本 */
export function serializeProfile(profile: UserProfile): string {
  const lines: string[] = [];
  const push = (label: string, value?: string) => {
    const v = value?.trim();
    if (v) lines.push(`${label}：${v}`);
  };

  lines.push('【候选人基本信息】');
  push('姓名', profile.name);
  push('求职意向', profile.targetTitle);
  push('工作年限', profile.yearsOfExperience);
  push('电话', profile.phone);
  push('邮箱', profile.email);
  push('所在地', profile.location);
  push('主页/作品集', profile.website);
  push('技能', profile.skills);
  push('语言能力', profile.languages);
  push('证书与奖项', profile.certifications);
  push('个人简介', profile.summary);

  if (profile.workExperiences.length > 0) {
    lines.push('', '【工作经历】');
    profile.workExperiences.forEach((w, i) => {
      if (!w.company && !w.title) return;
      lines.push(
        `${i + 1}. ${w.company || '（未填公司）'} / ${w.title || '（未填职位）'} / ${w.startDate || '?'} - ${w.current ? '至今' : w.endDate || '?'}`,
      );
      if (w.responsibilities.trim()) lines.push(`  职责：${w.responsibilities.replace(/\n/g, '；')}`);
      if (w.achievements.trim()) lines.push(`  成就：${w.achievements.replace(/\n/g, '；')}`);
      if (w.projects.trim()) lines.push(`  项目：${w.projects.replace(/\n/g, '；')}`);
      if (w.skills.trim()) lines.push(`  技能：${w.skills}`);
    });
  }

  if (profile.projects.length > 0) {
    lines.push('', '【项目经历】');
    profile.projects.forEach((p, i) => {
      if (!p.name && !p.description) return;
      lines.push(`${i + 1}. ${p.name}（${p.role}，${p.period}）`);
      if (p.description.trim()) lines.push(`  描述：${p.description.replace(/\n/g, ' ')}`);
      if (p.achievements.trim()) lines.push(`  成果：${p.achievements.replace(/\n/g, '；')}`);
      if (p.technologies.trim()) lines.push(`  技术/工具：${p.technologies}`);
    });
  }

  if (profile.educations.length > 0) {
    lines.push('', '【教育经历】');
    profile.educations.forEach((e) => {
      if (!e.school && !e.major) return;
      lines.push(
        `- ${e.school} / ${e.degree} / ${e.major} / ${e.startDate}-${e.endDate}`,
      );
    });
  }

  return lines.join('\n');
}

/** 简历解析：文本 -> 结构化档案 */
export function buildParseMessages(rawText: string): {
  system: string;
  user: string;
} {
  const system = `你是一位资深招聘官与简历解析专家。用户会提供从 PDF/Word 简历中提取出的原始文本，你需要将其解析为结构化 JSON。
要求：
1. 严格输出 JSON，不要输出任何解释或 markdown 代码块包裹。
2. JSON 字段结构：
{
  "name": string,
  "targetTitle": string,
  "phone": string,
  "email": string,
  "location": string,
  "website": string,
  "yearsOfExperience": string,
  "summary": string,
  "skills": string,
  "certifications": string,
  "languages": string,
  "workExperiences": [{ "company": string, "title": string, "startDate": string, "endDate": string, "current": boolean, "responsibilities": string, "achievements": string, "projects": string, "skills": string }],
  "projects": [{ "name": string, "role": string, "period": string, "description": string, "achievements": string, "technologies": string }],
  "educations": [{ "school": string, "degree": string, "major": string, "startDate": string, "endDate": string }]
}
3. 字符串字段缺失时填空字符串 ""；数组无内容时填空数组 []。
4. responsibilities / achievements / projects / certifications 等多条目字段，条目之间用换行符 \\n 分隔，每条保持一句话。
5. 时间统一保留原文写法（如 "2021.03"、"2021年3月"）；若经历持续至今则 endDate 为空字符串且 current=true。
6. 不要臆造原文没有的公司、学历或数据；无法判断的字段留空。
7. 同一人若有多个工作/项目/教育条目，全部按时间倒序保留。`;

  const user = `请解析以下简历原文：\n\n"""\n${rawText}\n"""`;
  return { system, user };
}

const LENGTH_HINT: Record<TargetJob['length'], string> = {
  'one-page': '严格控制在 A4 一页以内：工作经历只保留与岗位最相关的 2-3 段、每段 2-3 条 bullet，省略低相关项目与奖项。',
  standard: '控制在 A4 一至两页：保留相关度高的全部经历，每段 3-4 条 bullet。',
  'two-page': '内容可至两页：完整呈现职业发展脉络、项目细节与量化成果，但仍需删除与岗位完全无关的内容。',
};

/** 简历生成 prompt */
export function buildResumeMessages(
  profile: UserProfile,
  job: TargetJob,
): { system: string; user: string } {
  const langLabel = job.language === 'en' ? 'English' : '中文';
  const system = `你是一位拥有 15 年经验的资深职业顾问与简历优化专家，服务过互联网、金融、咨询、制造等行业候选人，深谙 ATS 筛选与招聘官阅读习惯。
你的任务：基于候选人的【真实经历】与目标岗位【职位描述 JD】，产出一份高度针对性的定制简历。

核心原则：
1. 只允许使用候选人提供的真实信息，可以重新表达、提炼、量化润色，但严禁虚构公司、职位、学历、技能、数据或项目经历。
2. JD 关键词策略：提炼 JD 中的核心能力与关键词，在技能、个人简介与 bullet point 中自然呼应（不得生硬堆砌）；候选人明显不具备的硬性要求不要写进简历。
3. 重写每条工作经历 bullet：采用"动词 + 做了什么 + 怎么做/规模 + 可量化结果"的结构，尽量把候选人原文中的成果改写为带数字/比例/业务影响的表达（数字必须来自原文或为保守的定性表述，禁止编造精确数字）。
4. 版块与排序：按与目标岗位的相关度重新排序工作经历中的 bullet 与项目；把最匹配的经历与技能前置。版块顺序建议：姓名与联系方式 → 求职意向/个人简介（3 句以内的岗位匹配摘要）→ 核心技能 → 工作经历 → 项目经历（如相关）→ 教育经历 → 证书/语言（如有）。无内容的版块直接省略。
5. 篇幅：${LENGTH_HINT[job.length]}
6. 语言：使用${langLabel}输出；若候选人原始信息为中文而要求英文，需专业、地道地翻译与改写。
7. 输出格式：使用 Markdown。一级 # 标题为候选人姓名（可在姓名下一行用普通文本写电话 · 邮箱 · 所在地 · 主页）；版块用 ## 二级标题；公司/项目名用 ### 三级标题，可在标题行用括号附上时间与职位；多条内容用无序列表。不要使用表格。不要输出任何解释、前后缀或"以下是为您优化的简历"之类的话。`;

  const user = `【目标岗位】
岗位名称：${job.title}${job.company ? `\n目标公司：${job.company}` : ''}

【职位描述 JD】
${job.jd || '（用户未提供 JD，请围绕岗位名称做通用的针对性优化）'}

【候选人档案】
${serializeProfile(profile)}

请输出定制简历的 Markdown 全文。`;

  return { system, user };
}

/** 面试建议生成 prompt（输出 JSON） */
export function buildInterviewMessages(
  profile: UserProfile,
  job: TargetJob,
): { system: string; user: string } {
  const system = `你是一位资深面试官与职业教练，熟悉行为面试（STAR）、结构化面试与各岗位专业面试。
请基于候选人的【真实经历】与目标岗位 JD，生成针对性的面试准备方案。

严格只输出 JSON（不要 markdown 代码块、不要解释），结构如下：
{
  "overview": string,
  "questions": [
    {
      "question": string,
      "category": "行为面试" | "专业技能" | "项目深挖" | "岗位认知" | "反问环节",
      "star": { "situation": string, "task": string, "action": string, "result": string },
      "tips": string
    }
  ],
  "skillGaps": [
    { "skill": string, "level": "high" | "medium" | "low", "reason": string, "advice": string }
  ],
  "preparationPoints": string[]
}

字段要求：
1. overview：2-3 句话，点出该候选人应聘该岗位的核心优势与最需要准备的方向。
2. questions：输出 8 个高频面试问题，覆盖五类 category（每类至少 1 个）：
   - 行为面试：协作/冲突/抗压/主动性等，必须结合候选人真实工作经历；
   - 专业技能：JD 要求且候选人具备的技能，考察深度与方法论；
   - 项目深挖：针对候选人项目/工作中的具体项目，问取舍、难点、数据、复盘；
   - 岗位认知：对该岗位业务、行业、职责的理解；
   - 反问环节：候选人可以反问面试官的高质量问题。
3. 每题的 star 必须基于候选人【真实经历】给出可讲述的回答框架：situation/task/action/result 各 1-2 句具体中文内容（明确指向候选人在哪家公司的哪段经历，不要写成万能模板）；若该问题不适合 STAR（如专业题），也要用 STAR 字段组织"背景-目标-做法-结果/结论"式回答思路。tips 给出回答注意点（1 句）。
4. skillGaps：对比 JD 要求与候选人技能，列出 3-5 项短板或风险点：level=high 表示 JD 硬性要求而候选人明显缺失/薄弱，medium 为需要加强，low 为加分项缺失；reason 说明判断依据，advice 给出面试前可执行的准备要点（如速成资源方向、如何在面试中转化表述）。若候选人与 JD 高度匹配，也要找出可提升项，不要返回空数组。
5. preparationPoints：5-8 条面试前准备清单（具体、可执行），如需要复习的知识点、应携带的作品、要提前调研的公司信息等。
6. 全部使用中文输出（即使岗位要求英文，建议内容仍用中文，英文面试题可在 question 中附英文问法括注）。`;

  const user = `【目标岗位】
岗位名称：${job.title}${job.company ? `\n目标公司：${job.company}` : ''}

【职位描述 JD】
${job.jd || '（用户未提供 JD，请围绕岗位名称生成通用但具体的面试准备）'}

【候选人档案】
${serializeProfile(profile)}

请输出面试准备方案 JSON。`;

  return { system, user };
}
