'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  FileDown,
  FileType2,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { consumeSSE } from '@/lib/sse-client';
import { downloadDocx, downloadTextFile } from '@/lib/export-docx';
import { profileHasContent } from '@/lib/profile-utils';
import type {
  InterviewPrep,
  TargetJob,
  UserProfile,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface StepInterviewProps {
  profile: UserProfile;
  job: TargetJob;
  prep: InterviewPrep | null;
  onPrepChange: (prep: InterviewPrep | null) => void;
  onGoStep: (step: 1 | 2 | 3) => void;
}

const LEVEL_META: Record<
  'high' | 'medium' | 'low',
  { label: string; className: string }
> = {
  high: {
    label: '重点补齐',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  medium: {
    label: '建议加强',
    className: 'border-warning/50 bg-warning/10 text-warning',
  },
  low: {
    label: '加分项',
    className: 'border-success/40 bg-success/10 text-success',
  },
};

const CATEGORY_STYLE: Record<string, string> = {
  行为面试: 'bg-primary/10 text-primary border-primary/30',
  专业技能: 'bg-[oklch(0.55_0.06_250)]/10 text-[oklch(0.45_0.09_250)] border-[oklch(0.55_0.06_250)]/30',
  项目深挖: 'bg-success/10 text-success border-success/30',
  岗位认知: 'bg-warning/10 text-warning border-warning/30',
  反问环节: 'bg-muted text-muted-foreground border-border',
};

function prepToMarkdown(prep: InterviewPrep, job: TargetJob): string {
  const lines: string[] = [];
  lines.push(`# 面试准备建议：${job.title}`, '');
  if (prep.overview) lines.push('## 总体评估', '', prep.overview, '');
  if (prep.questions.length > 0) {
    lines.push('## 高频面试问题与 STAR 回答框架', '');
    prep.questions.forEach((q, i) => {
      lines.push(`### ${i + 1}. [${q.category}] ${q.question}`, '');
      lines.push(`- **S（情境）**：${q.star.situation}`);
      lines.push(`- **T（任务）**：${q.star.task}`);
      lines.push(`- **A（行动）**：${q.star.action}`);
      lines.push(`- **R（结果）**：${q.star.result}`);
      if (q.tips) lines.push(`- **回答提示**：${q.tips}`);
      lines.push('');
    });
  }
  if (prep.skillGaps.length > 0) {
    lines.push('## 技能短板与准备要点', '');
    prep.skillGaps.forEach((gap) => {
      const levelLabel = LEVEL_META[gap.level].label;
      lines.push(
        `- **${gap.skill}**（${levelLabel}）：${gap.reason} 准备建议：${gap.advice}`,
      );
    });
    lines.push('');
  }
  if (prep.preparationPoints.length > 0) {
    lines.push('## 面试前准备清单', '');
    prep.preparationPoints.forEach((point) => lines.push(`- ${point}`));
  }
  return lines.join('\n');
}

export function StepInterview({
  profile,
  job,
  prep,
  onPrepChange,
  onGoStep,
}: StepInterviewProps) {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const ready = profileHasContent(profile) && job.title.trim().length > 0;

  const generate = async () => {
    if (!profileHasContent(profile)) {
      toast.error('请先完善工作经历');
      onGoStep(1);
      return;
    }
    if (!job.title.trim()) {
      toast.error('请先填写目标岗位');
      onGoStep(2);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setStatus('正在对照 JD 与你的经历，梳理高频考点…');
    onPrepChange(null);

    try {
      await consumeSSE(
        '/api/interview/generate',
        { profile, job },
        {
          signal: controller.signal,
          onStatus: setStatus,
          onData: (payload) => {
            onPrepChange(payload as InterviewPrep);
          },
        },
      );
      setStatus('');
      toast.success('面试准备方案已生成');
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        toast.message('已停止生成');
      } else {
        toast.error(error instanceof Error ? error.message : '生成失败，请重试');
      }
      setStatus('');
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  };

  // 首次进入（或更换岗位/经历后首次进入）且条件满足时自动生成一次
  const contextKey = `${job.title}::${job.jd.length}::${profile.workExperiences.length}::${profile.projects.length}`;
  const triedKeyRef = useRef<string>('');
  useEffect(() => {
    if (ready && !prep && !generating && triedKeyRef.current !== contextKey) {
      triedKeyRef.current = contextKey;
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, contextKey]);

  const stop = () => abortRef.current?.abort();

  const handleExportWord = async () => {
    if (!prep) return;
    try {
      const md = prepToMarkdown(prep, job);
      const name = `${profile.name || '候选人'}-${job.title || '岗位'}-面试准备`;
      await downloadDocx(md, name, name);
      toast.success('Word 文档已开始下载');
    } catch {
      toast.error('导出失败，请重试');
    }
  };

  const handleExportMarkdown = () => {
    if (!prep) return;
    const name = `${profile.name || '候选人'}-${job.title || '岗位'}-面试准备.md`;
    downloadTextFile(prepToMarkdown(prep, job), name, 'text/markdown;charset=utf-8');
  };

  const hasResult = prep !== null;

  return (
    <div className="step-enter space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-wide">
            面试准备建议
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            结合岗位 JD 与你的真实经历，生成高频问题的 STAR 回答框架与技能短板提示。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generating ? (
            <Button variant="outline" onClick={stop}>
              <Square className="size-4" />
              停止生成
            </Button>
          ) : (
            <Button onClick={() => void generate()} disabled={!ready}>
              {hasResult ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
              {hasResult ? '重新生成' : '生成面试方案'}
            </Button>
          )}
          {hasResult && !generating && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="size-4" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void handleExportWord()}>
                  <FileDown className="size-4" />
                  导出 Word（.docx）
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMarkdown}>
                  <FileType2 className="size-4" />
                  导出 Markdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {!ready && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          还无法生成：
          {!profileHasContent(profile) && (
            <Button variant="link" className="h-auto px-1 py-0" onClick={() => onGoStep(1)}>
              先录入工作经验
            </Button>
          )}
          {!job.title.trim() && (
            <Button variant="link" className="h-auto px-1 py-0" onClick={() => onGoStep(2)}>
              填写目标岗位
            </Button>
          )}
        </div>
      )}

      {generating && !hasResult && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-24 text-center">
          <RefreshCw className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium">{status || 'AI 正在准备…'}</p>
          <p className="text-xs text-muted-foreground">
            正在结合你的经历逐题设计 STAR 回答框架，约需 20-40 秒
          </p>
        </div>
      )}

      {hasResult && prep && (
        <div className="space-y-5">
          {prep.overview && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-serif text-lg">
                  <Sparkles className="size-5 text-primary/80" />
                  总体评估
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-foreground/90">{prep.overview}</p>
              </CardContent>
            </Card>
          )}

          {/* 技能短板 */}
          {prep.skillGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-lg">
                  <AlertTriangle className="size-5 text-warning" />
                  技能短板与准备要点
                </CardTitle>
                <CardDescription>
                  对比 JD 要求与你的履历得出，按紧迫程度排序参考。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {prep.skillGaps.map((gap) => (
                  <div
                    key={gap.skill}
                    className="rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{gap.skill}</span>
                      <Badge
                        variant="outline"
                        className={cn('font-normal', LEVEL_META[gap.level].className)}
                      >
                        {LEVEL_META[gap.level].label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      {gap.reason}
                    </p>
                    <p className="mt-2 text-[13px] leading-6">
                      <span className="font-medium text-primary">准备建议：</span>
                      {gap.advice}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 高频问题 STAR */}
          {prep.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-lg">
                  <MessagesSquare className="size-5 text-primary/80" />
                  高频面试问题 · STAR 回答框架
                </CardTitle>
                <CardDescription>
                  每题都基于你的真实经历组织，展开即可查看情境、任务、行动与结果要点。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {prep.questions.map((q, index) => (
                    <AccordionItem
                      key={`${q.question}-${index}`}
                      value={`q-${index}`}
                      className="last:border-b-0"
                    >
                      <AccordionTrigger className="gap-3 py-4 text-left hover:no-underline">
                        <span className="flex flex-1 items-start gap-3">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <span className="space-y-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-normal',
                                CATEGORY_STYLE[q.category] ?? CATEGORY_STYLE['行为面试'],
                              )}
                            >
                              {q.category}
                            </Badge>
                            <span className="block text-sm font-medium leading-6">
                              {q.question}
                            </span>
                          </span>
                        </span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" />
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pb-2 pl-9 pr-2">
                          {(
                            [
                              ['S 情境', q.star.situation],
                              ['T 任务', q.star.task],
                              ['A 行动', q.star.action],
                              ['R 结果', q.star.result],
                            ] as const
                          ).map(([label, content]) => (
                            <div
                              key={label}
                              className="grid grid-cols-[64px_1fr] gap-3 text-[13px] leading-6"
                            >
                              <span className="pt-0.5 font-serif font-semibold text-primary">
                                {label}
                              </span>
                              <span className="text-foreground/90">{content}</span>
                            </div>
                          ))}
                          {q.tips && (
                            <p className="rounded-md bg-primary/[0.06] px-3 py-2 text-xs leading-6 text-primary/90">
                              回答提示：{q.tips}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* 准备清单 */}
          {prep.preparationPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-lg">
                  <ClipboardList className="size-5 text-success" />
                  面试前准备清单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {prep.preparationPoints.map((point, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-6"
                    >
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {prep.questions.length === 0 &&
            prep.skillGaps.length === 0 &&
            prep.preparationPoints.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  本次生成结果解析异常，可查看上方文本或点击「重新生成」。
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
