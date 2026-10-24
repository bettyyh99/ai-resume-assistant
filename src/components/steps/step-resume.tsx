'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FileDown,
  FileType2,
  PencilLine,
  Printer,
  RefreshCw,
  Sparkles,
  Square,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { consumeSSE } from '@/lib/sse-client';
import { downloadDocx, downloadTextFile } from '@/lib/export-docx';
import { profileHasContent } from '@/lib/profile-utils';
import type { TargetJob, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StepResumeProps {
  profile: UserProfile;
  job: TargetJob;
  resumeMarkdown: string;
  onResumeChange: (markdown: string) => void;
  onGoStep: (step: 1 | 2) => void;
}

export function StepResume({
  profile,
  job,
  resumeMarkdown,
  onResumeChange,
  onGoStep,
}: StepResumeProps) {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ready = profileHasContent(profile) && job.title.trim().length > 0;

  const generate = async () => {
    if (!profileHasContent(profile)) {
      toast.error('请先在第一步填写工作经历或技能简介');
      onGoStep(1);
      return;
    }
    if (!job.title.trim()) {
      toast.error('请先在第二步填写目标岗位名称');
      onGoStep(2);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setEditing(false);
    setStatus('正在准备生成…');

    let accumulated = '';
    onResumeChange('');

    try {
      await consumeSSE(
        '/api/resume/generate',
        { profile, job },
        {
          signal: controller.signal,
          onStatus: setStatus,
          onDelta: (chunk) => {
            accumulated += chunk;
            onResumeChange(accumulated);
          },
        },
      );
      setStatus('');
      toast.success('定制简历已生成');
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

  const stop = () => abortRef.current?.abort();

  const handleExportWord = async () => {
    try {
      const name = `${profile.name || '候选人'}-${job.title || '定制简历'}`;
      await downloadDocx(resumeMarkdown, name, `${name} 定制简历`);
      toast.success('Word 文档已开始下载');
    } catch {
      toast.error('Word 导出失败，请重试');
    }
  };

  const handleExportMarkdown = () => {
    const name = `${profile.name || '候选人'}-${job.title || '定制简历'}.md`;
    downloadTextFile(resumeMarkdown, name, 'text/markdown;charset=utf-8');
  };

  const handlePrint = () => {
    window.print();
  };

  const hasResult = resumeMarkdown.trim().length > 0;

  return (
    <div className="step-enter space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-wide">
            针对性定制简历
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.title
              ? `目标岗位：${job.title}${job.company ? ` · ${job.company}` : ''}`
              : 'AI 将围绕 JD 重写经历、调整版块与篇幅'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {generating ? (
            <Button variant="outline" onClick={stop}>
              <Square className="size-4" />
              停止生成
            </Button>
          ) : (
            <Button onClick={() => void generate()} disabled={!ready}>
              {hasResult ? (
                <RefreshCw className="size-4" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {hasResult ? '重新生成' : '开始生成简历'}
            </Button>
          )}
          {hasResult && !generating && (
            <>
              <Button
                variant="outline"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? <Eye className="size-4" /> : <PencilLine className="size-4" />}
                {editing ? '预览模式' : '手动编辑'}
              </Button>
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
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="size-4" />
                    打印 / 另存为 PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportMarkdown}>
                    <FileType2 className="size-4" />
                    导出 Markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {!ready && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm leading-6">
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

      {!hasResult && !generating && ready && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/60 px-6 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-8" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold">准备生成你的专属简历</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              系统会提炼 JD 关键词，重写每一条经历为「动作 + 方法 + 量化结果」，
              并按岗位相关度重新组织版块与排序。点击右上角「开始生成简历」。
            </p>
          </div>
        </div>
      )}

      {generating && !hasResult && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-24 text-center">
          <RefreshCw className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium">{status || 'AI 正在撰写…'}</p>
          <p className="text-xs text-muted-foreground">通常需要 15-40 秒，内容会逐段呈现</p>
        </div>
      )}

      {(hasResult || generating) && (
        <div className="relative">
          {generating && (
            <div className="mb-2 flex items-center gap-2 text-xs text-primary">
              <RefreshCw className="size-3.5 animate-spin" />
              {status || '正在生成…'}
            </div>
          )}
          <div className="mx-auto max-w-[820px]">
            {editing ? (
              <Textarea
                value={resumeMarkdown}
                onChange={(e) => onResumeChange(e.target.value)}
                rows={30}
                className="thin-scroll font-mono text-[13px] leading-7"
              />
            ) : (
              <div
                className={cn(
                  'resume-paper print-area mx-auto rounded-md px-10 py-12 sm:px-14',
                  generating && 'stream-caret',
                )}
              >
                <MarkdownRenderer content={resumeMarkdown} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
