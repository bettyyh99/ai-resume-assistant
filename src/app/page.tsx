'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Feather, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Stepper } from '@/components/stepper';
import { StepProfile } from '@/components/steps/step-profile';
import { StepJob } from '@/components/steps/step-job';
import { StepResume } from '@/components/steps/step-resume';
import { StepInterview } from '@/components/steps/step-interview';
import {
  createDefaultJob,
  createEmptyProfile,
  profileHasContent,
} from '@/lib/profile-utils';
import type {
  InterviewPrep,
  ParseResult,
  TargetJob,
  UserProfile,
  WizardStep,
} from '@/lib/types';

const STORAGE_KEY = 'zhimo-resume-assistant-v1';

interface PersistedState {
  profile: UserProfile;
  job: TargetJob;
  resumeMarkdown: string;
  prep: InterviewPrep | null;
  step: WizardStep;
}

function loadState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [maxReached, setMaxReached] = useState<WizardStep>(1);
  const [profile, setProfile] = useState<UserProfile>(createEmptyProfile);
  const [job, setJob] = useState<TargetJob>(createDefaultJob);
  const [resumeMarkdown, setResumeMarkdown] = useState('');
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [jobSaveTick, setJobSaveTick] = useState(0);

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setProfile(saved.profile);
      setJob(saved.job);
      setResumeMarkdown(saved.resumeMarkdown ?? '');
      setPrep(saved.prep ?? null);
      setStep(saved.step ?? 1);
      setMaxReached(saved.step ?? 1);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = {
      profile,
      job,
      resumeMarkdown,
      prep,
      step,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // 存储超限或被禁用时静默忽略
    }
  }, [hydrated, profile, job, resumeMarkdown, prep, step]);

  const goTo = useCallback(
    (next: WizardStep) => {
      setStep(next);
      setMaxReached((prev) => (next > prev ? next : prev));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [],
  );

  const handleParsed = useCallback((result: ParseResult) => {
    setProfile((prev) => ({
      ...result.profile,
      // 保留用户已填写但解析结果缺失的联系方式
      phone: result.profile.phone || prev.phone,
      email: result.profile.email || prev.email,
    }));
    // 档案更新后，历史生成内容失效
    setResumeMarkdown('');
    setPrep(null);
  }, []);

  const updateProfile = useCallback((next: UserProfile) => {
    setProfile(next);
  }, []);

  const resetAll = () => {
    setProfile(createEmptyProfile());
    setJob(createDefaultJob());
    setResumeMarkdown('');
    setPrep(null);
    setStep(1);
    setMaxReached(1);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const canNextFromStep1 = profileHasContent(profile);
  const canNextFromStep2 = job.title.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Feather className="size-5" />
            </span>
            <div>
              <p className="font-serif text-lg font-bold leading-5 tracking-wide">
                职墨 AI
              </p>
              <p className="text-[11px] leading-4 text-muted-foreground">
                精准简历与面试助手
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <RotateCcw className="size-4" />
                <span className="hidden sm:inline">清空重填</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定清空全部内容？</AlertDialogTitle>
                <AlertDialogDescription>
                  将删除当前档案、目标岗位、已生成的简历与面试建议，且无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>再想想</AlertDialogCancel>
                <AlertDialogAction onClick={resetAll}>确认清空</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* 主体：左步骤 + 右工作区 */}
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
        <aside className="shrink-0 lg:w-64">
          <div className="rounded-xl border border-border bg-card/70 p-4 lg:sticky lg:top-24">
            <p className="mb-3 px-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              工作流
            </p>
            <Stepper current={step} maxReached={maxReached} onNavigate={goTo} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-10">
          {!hydrated ? (
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card/60" />
          ) : (
            <>
              {step === 1 && (
                <StepProfile
                  profile={profile}
                  onChange={updateProfile}
                  onParsed={handleParsed}
                />
              )}
              {step === 2 && (
                <StepJob job={job} onChange={setJob} saveTick={jobSaveTick} />
              )}
              {step === 3 && (
                <StepResume
                  profile={profile}
                  job={job}
                  resumeMarkdown={resumeMarkdown}
                  onResumeChange={setResumeMarkdown}
                  onGoStep={(s) => goTo(s)}
                />
              )}
              {step === 4 && (
                <StepInterview
                  profile={profile}
                  job={job}
                  prep={prep}
                  onPrepChange={setPrep}
                  onGoStep={(s) => goTo(s)}
                />
              )}

              {/* 底部步骤导航 */}
              <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                <Button
                  variant="outline"
                  onClick={() => goTo((step - 1) as WizardStep)}
                  disabled={step === 1}
                >
                  <ArrowLeft className="size-4" />
                  上一步
                </Button>

                {step < 4 ? (
                  <Button
                    onClick={() => {
                      if (step === 1 && !canNextFromStep1) return;
                      if (step === 2 && !canNextFromStep2) return;
                      if (step === 2) setJobSaveTick((n) => n + 1);
                      goTo((step + 1) as WizardStep);
                    }}
                    disabled={
                      (step === 1 && !canNextFromStep1) ||
                      (step === 2 && !canNextFromStep2)
                    }
                  >
                    {step === 2 ? '生成定制简历' : '下一步'}
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => goTo(3)}>
                    返回简历
                  </Button>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          职墨 AI · 所有内容由模型基于你填写的真实信息生成，请在投递前核对关键事实
        </p>
      </footer>
    </div>
  );
}
