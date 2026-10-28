'use client';

import { useEffect, useState } from 'react';
import {
  Bookmark,
  Building2,
  Clock,
  FileText,
  History,
  Target,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  deleteJobHistory,
  formatSavedTime,
  getJobHistory,
  saveJobHistory,
  type JobHistoryItem,
} from '@/lib/history-storage';
import { cn } from '@/lib/utils';
import type { TargetJob } from '@/lib/types';

interface StepJobProps {
  job: TargetJob;
  onChange: (job: TargetJob) => void;
  /** 从第 2 步进入第 3 步时自增，用于触发自动保存当前岗位 */
  saveTick: number;
}

const LENGTH_OPTIONS: {
  value: TargetJob['length'];
  title: string;
  desc: string;
}[] = [
  { value: 'one-page', title: '精简一页', desc: '只保留最相关经历，适合校招 / 初筛' },
  { value: 'standard', title: '标准 1-2 页', desc: '完整呈现匹配经历，推荐多数岗位' },
  { value: 'two-page', title: '详尽两页', desc: '展开项目细节，适合资深 / 技术岗' },
];

export function StepJob({ job, onChange, saveTick }: StepJobProps) {
  const [history, setHistory] = useState<JobHistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHistory(getJobHistory());
    setHydrated(true);
  }, []);

  // 点击「生成定制简历」时 page 层自增 saveTick，触发自动保存
  useEffect(() => {
    if (saveTick === 0 || !job.title.trim()) return;
    const next = getJobHistory();
    const exists = next.some(
      (item) =>
        item.job.title.trim() === job.title.trim() &&
        item.job.company.trim() === job.company.trim() &&
        item.job.jd.trim() === job.jd.trim(),
    );
    if (!exists) {
      setHistory(saveJobHistory(job));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveTick]);

  const set = <K extends keyof TargetJob>(key: K, value: TargetJob[K]) =>
    onChange({ ...job, [key]: value });

  const loadFromHistory = (item: JobHistoryItem) => {
    onChange(structuredClone(item.job));
  };

  const removeFromHistory = (id: string) => {
    setHistory(deleteJobHistory(id));
  };

  const saveToLibrary = () => {
    if (!job.title.trim()) {
      toast.error('请先填写目标岗位名称，再存入历史岗位');
      return;
    }
    const next = saveJobHistory(job);
    setHistory(next);
    toast.success(`已存入历史岗位（当前共 ${next.length} 个，最多保存 8 个）`);
  };

  return (
    <div className="step-enter space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-wide">
          描述你的目标岗位
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          粘贴完整 JD 效果最好——AI 会提炼岗位关键词，让简历与面试准备精准对齐招聘要求。点击「存入历史岗位」或「生成定制简历」时都会保存到本地历史（最多 8 个）。
        </p>
      </div>

      {hydrated && history.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 font-serif text-base">
                <History className="size-4 text-primary/80" />
                历史岗位
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                本地保存 · {history.length}/{8}
              </span>
            </div>
            <CardDescription>
              点击可快速复用之前填写的岗位信息，最多保存 8 个，超出后自动替换最旧记录。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors',
                    item.job.title === job.title && item.job.jd === job.jd
                      ? 'border-primary/50 bg-primary/[0.03]'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => loadFromHistory(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      <Target className="size-3.5 shrink-0 text-primary/70" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.headline}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <Clock className="size-3" />
                      {formatSavedTime(item.savedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromHistory(item.id)}
                    aria-label="删除该历史岗位"
                    className="rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="font-serif text-lg">岗位信息</CardTitle>
              <CardDescription>
                岗位名称为必填，JD 缺失时将按岗位名称做通用优化。
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={saveToLibrary}>
              <Bookmark className="size-4" />
              存入历史岗位
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job-title" className="flex items-center gap-1.5 text-[13px]">
                <Target className="size-3.5 text-primary/70" />
                目标岗位名称 <span className="text-primary">*</span>
              </Label>
              <Input
                id="job-title"
                value={job.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="如：高级产品经理（增长方向）"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-company" className="flex items-center gap-1.5 text-[13px]">
                <Building2 className="size-3.5 text-primary/70" />
                目标公司（选填）
              </Label>
              <Input
                id="job-company"
                value={job.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="如：字节跳动"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job-jd" className="flex items-center gap-1.5 text-[13px]">
              <FileText className="size-3.5 text-primary/70" />
              职位描述（JD）
            </Label>
            <Textarea
              id="job-jd"
              rows={12}
              value={job.jd}
              onChange={(e) => set('jd', e.target.value)}
              placeholder={
                '粘贴招聘启事中的岗位职责与任职要求，例如：\n岗位职责：\n1. 负责 XX 产品的规划与迭代……\n任职要求：\n1. 3 年以上产品经验，具备数据驱动增长能力……'
              }
              className="leading-7"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>建议包含「岗位职责」和「任职要求」两部分</span>
              <span>{job.jd.length} 字</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px]">简历篇幅</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {LENGTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set('length', option.value)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-all duration-200',
                    job.length === option.value
                      ? 'border-primary bg-primary/[0.05] ring-1 ring-primary/30'
                      : 'border-border bg-card hover:border-primary/40',
                  )}
                >
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {option.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px]">简历语言</Label>
            <div className="flex gap-3">
              {(
                [
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set('language', option.value)}
                  className={cn(
                    'min-w-28 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                    job.language === option.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/40',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
