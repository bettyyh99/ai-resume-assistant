'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/lib/types';

interface StepMeta {
  step: WizardStep;
  title: string;
  subtitle: string;
}

const STEPS: StepMeta[] = [
  { step: 1, title: '录入经验', subtitle: '上传简历或在线填写' },
  { step: 2, title: '选定岗位', subtitle: '岗位名称与 JD' },
  { step: 3, title: '定制简历', subtitle: 'AI 生成与导出' },
  { step: 4, title: '面试准备', subtitle: 'STAR 题库与短板' },
];

interface StepperProps {
  current: WizardStep;
  maxReached: WizardStep;
  onNavigate: (step: WizardStep) => void;
}

export function Stepper({ current, maxReached, onNavigate }: StepperProps) {
  return (
    <nav aria-label="生成步骤" className="flex flex-col gap-1">
      {STEPS.map((meta, index) => {
        const done = meta.step < current;
        const active = meta.step === current;
        const locked = meta.step > maxReached;
        return (
          <div key={meta.step} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={locked}
                onClick={() => onNavigate(meta.step)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200',
                  active &&
                    'border-primary bg-primary text-primary-foreground shadow-sm',
                  done &&
                    'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15',
                  locked &&
                    'cursor-not-allowed border-border bg-card text-muted-foreground/50',
                  !active && !done && !locked && 'border-border bg-card text-foreground hover:border-primary/40',
                )}
              >
                {done ? <Check className="size-4" /> : meta.step}
              </button>
              {index < STEPS.length - 1 && (
                <span
                  className={cn(
                    'my-1 w-px flex-1 min-h-4',
                    meta.step < current ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              )}
            </div>
            <button
              type="button"
              disabled={locked}
              onClick={() => onNavigate(meta.step)}
              className={cn(
                'flex flex-1 flex-col items-start rounded-lg px-2 py-1 text-left transition-colors',
                locked ? 'cursor-not-allowed' : 'hover:bg-accent/60',
              )}
            >
              <span
                className={cn(
                  'font-serif text-[15px] font-semibold leading-6',
                  active ? 'text-foreground' : locked ? 'text-muted-foreground/60' : 'text-foreground/80',
                )}
              >
                {meta.title}
              </span>
              <span className="text-xs leading-5 text-muted-foreground">
                {meta.subtitle}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
