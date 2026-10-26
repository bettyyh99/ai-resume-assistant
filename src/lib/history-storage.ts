import type { TargetJob, UserProfile } from '@/lib/types';

/**
 * 本地历史记录：仅存浏览器 localStorage，不上传服务器。
 * - 历史简历最多 5 份
 * - 历史岗位最多 8 个
 */

const RESUME_KEY = 'zhimo-resume-history-v1';
const JOB_KEY = 'zhimo-job-history-v1';

export const RESUME_HISTORY_LIMIT = 5;
export const JOB_HISTORY_LIMIT = 8;

export interface ResumeHistoryItem {
  id: string;
  /** 简历名称：优先姓名，其次意向岗位，再次兜底 */
  label: string;
  /** 最近一段工作经历摘要，如「产品经理 · 云栖科技」 */
  headline: string;
  source: 'upload' | 'manual';
  savedAt: number;
  profile: UserProfile;
}

export interface JobHistoryItem {
  id: string;
  /** 岗位名称 */
  label: string;
  /** 公司或 JD 摘要 */
  headline: string;
  savedAt: number;
  job: TargetJob;
}

function safeId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // 存储被禁用或超限时静默忽略
  }
}

/* ---------------- 历史简历 ---------------- */

function resumeFingerprint(profile: UserProfile): string {
  const firstWork = profile.workExperiences[0];
  return [
    profile.name.trim(),
    profile.targetTitle.trim(),
    firstWork?.company.trim() ?? '',
    firstWork?.title.trim() ?? '',
    profile.skills.trim(),
  ]
    .join('|')
    .toLowerCase();
}

function resumeHeadline(profile: UserProfile): string {
  const firstWork = profile.workExperiences.find(
    (w) => w.company.trim() || w.title.trim(),
  );
  if (firstWork) {
    return [firstWork.title, firstWork.company].filter(Boolean).join(' · ') || '未填写职位';
  }
  if (profile.targetTitle.trim()) return profile.targetTitle.trim();
  return '手动填写的简历';
}

export function getResumeHistory(): ResumeHistoryItem[] {
  return readList<ResumeHistoryItem>(RESUME_KEY);
}

/**
 * 保存一份简历到历史。相同内容指纹的记录去重并置顶；
 * 超过上限时淘汰最旧记录。返回保存后的列表。
 */
export function saveResumeHistory(
  profile: UserProfile,
  source: ResumeHistoryItem['source'] = 'manual',
): ResumeHistoryItem[] {
  const list = getResumeHistory();
  const fingerprint = resumeFingerprint(profile);
  const now = Date.now();
  const filtered = list.filter(
    (item) => resumeFingerprint(item.profile) !== fingerprint,
  );
  const item: ResumeHistoryItem = {
    id: safeId(),
    label: profile.name.trim() || profile.targetTitle.trim() || '未命名简历',
    headline: resumeHeadline(profile),
    source,
    savedAt: now,
    profile,
  };
  const next = [item, ...filtered].slice(0, RESUME_HISTORY_LIMIT);
  writeList(RESUME_KEY, next);
  return next;
}

export function deleteResumeHistory(id: string): ResumeHistoryItem[] {
  const next = getResumeHistory().filter((item) => item.id !== id);
  writeList(RESUME_KEY, next);
  return next;
}

/* ---------------- 历史岗位 ---------------- */

function jobFingerprint(job: TargetJob): string {
  return [job.title.trim(), job.company.trim(), job.jd.trim()]
    .join('|')
    .toLowerCase();
}

function jobHeadline(job: TargetJob): string {
  if (job.company.trim()) return job.company.trim();
  const snippet = job.jd.replace(/\s+/g, ' ').trim();
  return snippet ? `${snippet.slice(0, 40)}${snippet.length > 40 ? '…' : ''}` : '未填写 JD';
}

export function getJobHistory(): JobHistoryItem[] {
  return readList<JobHistoryItem>(JOB_KEY);
}

/**
 * 保存一个岗位到历史。岗位名称为空时不保存。
 * 相同岗位（标题 + 公司 + JD）去重置顶；超过上限淘汰最旧。
 */
export function saveJobHistory(job: TargetJob): JobHistoryItem[] {
  if (!job.title.trim()) return getJobHistory();
  const list = getJobHistory();
  const fingerprint = jobFingerprint(job);
  const now = Date.now();
  const filtered = list.filter((item) => jobFingerprint(item.job) !== fingerprint);
  const item: JobHistoryItem = {
    id: safeId(),
    label: job.title.trim(),
    headline: jobHeadline(job),
    savedAt: now,
    job,
  };
  const next = [item, ...filtered].slice(0, JOB_HISTORY_LIMIT);
  writeList(JOB_KEY, next);
  return next;
}

export function deleteJobHistory(id: string): JobHistoryItem[] {
  const next = getJobHistory().filter((item) => item.id !== id);
  writeList(JOB_KEY, next);
  return next;
}

/* ---------------- 通用 ---------------- */

export function formatSavedTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
