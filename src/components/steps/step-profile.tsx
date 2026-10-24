'use client';

import { useRef, useState } from 'react';
import {
  Briefcase,
  FileUp,
  FileText,
  GraduationCap,
  Loader2,
  PenLine,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  createEmptyEducation,
  createEmptyProject,
  createEmptyWork,
  createSampleProfile,
} from '@/lib/profile-utils';
import type {
  EducationExperience,
  ParseResult,
  ProjectExperience,
  UserProfile,
  WorkExperience,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface StepProfileProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  onParsed: (result: ParseResult) => void;
}

type InputMode = 'upload' | 'form';

const ACCEPT = '.pdf,.doc,.docx,.txt';
const MAX_SIZE = 10 * 1024 * 1024;

export function StepProfile({
  profile,
  onChange,
  onParsed,
}: StepProfileProps) {
  const [mode, setMode] = useState<InputMode>(
    profile.workExperiences.length > 1 ||
      profile.projects.length > 0 ||
      profile.summary
      ? 'form'
      : 'upload',
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K],
  ) => {
    onChange({ ...profile, [key]: value });
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      toast.error('仅支持 PDF、Word（doc/docx）或 TXT 文件');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('文件不能超过 10 MB');
      return;
    }
    setUploading(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as ParseResult & { error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? '解析失败');
      }
      onParsed(data);
      toast.success('简历解析完成，请核对识别结果');
      setMode('form');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '简历解析失败');
    } finally {
      setUploading(false);
    }
  };

  const loadSample = () => {
    onChange(createSampleProfile());
    setMode('form');
    toast.success('已载入示例档案，可直接体验后续步骤');
  };

  return (
    <div className="step-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-wide">
            录入你的过往经验
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            上传简历由 AI 自动识别，或直接在线填写。信息仅用于本次生成，不会被持久化保存。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSample}>
          <Sparkles className="size-4" />
          载入示例体验
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-1 sm:max-w-md">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
            mode === 'upload'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FileUp className="size-4" />
          上传简历
        </button>
        <button
          type="button"
          onClick={() => setMode('form')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
            mode === 'form'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <PenLine className="size-4" />
          在线填写
        </button>
      </div>

      {mode === 'upload' ? (
        <Card>
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-primary/[0.03]',
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                {uploading ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : (
                  <UploadCloud className="size-7" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {uploading
                    ? `正在解析「${fileName}」…`
                    : '点击或拖拽简历到此处上传'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 PDF / Word（doc、docx）/ TXT，文件不超过 10 MB
                </p>
              </div>
              {uploading && (
                <p className="max-w-sm text-xs text-muted-foreground">
                  正在提取文字并由 AI 识别公司、职位、项目与技能，通常需要 10-30 秒
                </p>
              )}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
              <FileText className="mt-0.5 size-4 shrink-0 text-primary/70" />
              <p>
                扫描件 / 图片版 PDF 无法提取文字，建议改用在线填写；解析后会自动切换到表单视图，你可以逐条核对与修正识别结果。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <BasicInfo profile={profile} setField={setField} />
          <WorkList profile={profile} onChange={onChange} />
          <ProjectList profile={profile} onChange={onChange} />
          <EducationList profile={profile} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/* ---------------- 基本信息 ---------------- */

type SetField = <K extends keyof UserProfile>(
  key: K,
  value: UserProfile[K],
) => void;

function BasicInfo({
  profile,
  setField,
}: {
  profile: UserProfile;
  setField: SetField;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">基本信息</CardTitle>
        <CardDescription>姓名与联系方式会出现在简历抬头，技能建议用逗号分隔。</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="姓名">
          <Input
            value={profile.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="张三"
          />
        </Field>
        <Field label="求职意向 / 当前职位">
          <Input
            value={profile.targetTitle}
            onChange={(e) => setField('targetTitle', e.target.value)}
            placeholder="高级产品经理"
          />
        </Field>
        <Field label="工作年限">
          <Input
            value={profile.yearsOfExperience}
            onChange={(e) => setField('yearsOfExperience', e.target.value)}
            placeholder="5 年"
          />
        </Field>
        <Field label="电话">
          <Input
            value={profile.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="138-0000-0000"
          />
        </Field>
        <Field label="邮箱">
          <Input
            type="email"
            value={profile.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="所在城市">
          <Input
            value={profile.location}
            onChange={(e) => setField('location', e.target.value)}
            placeholder="上海"
          />
        </Field>
        <Field label="作品集 / 主页（选填）" full>
          <Input
            value={profile.website}
            onChange={(e) => setField('website', e.target.value)}
            placeholder="https:// 或 linkedin 地址"
          />
        </Field>
        <Field
          label="核心技能"
          hint="逗号或顿号分隔，AI 会结合 JD 调整呈现顺序"
          full
        >
          <Textarea
            rows={2}
            value={profile.skills}
            onChange={(e) => setField('skills', e.target.value)}
            placeholder="需求分析、数据分析（SQL）、用户增长、A/B 测试…"
          />
        </Field>
        <Field label="个人简介 / 自我评价（选填）" hint="2-4 句概括资历与亮点" full>
          <Textarea
            rows={3}
            value={profile.summary}
            onChange={(e) => setField('summary', e.target.value)}
            placeholder="X 年 XX 行业经验，擅长……，曾主导……"
          />
        </Field>
        <Field label="证书 / 奖项（选填，每行一条）" full>
          <Textarea
            rows={2}
            value={profile.certifications}
            onChange={(e) => setField('certifications', e.target.value)}
            placeholder={'PMP 项目管理认证（2022）\n年度优秀员工（2023）'}
          />
        </Field>
        <Field label="语言能力（选填）" full>
          <Input
            value={profile.languages}
            onChange={(e) => setField('languages', e.target.value)}
            placeholder="英语 CET-6，可作为工作语言"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', full && 'sm:col-span-2 lg:col-span-3')}>
      <Label className="text-[13px] font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------------- 工作经历 ---------------- */

function WorkList({
  profile,
  onChange,
}: {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}) {
  const update = (id: string, patch: Partial<WorkExperience>) => {
    onChange({
      ...profile,
      workExperiences: profile.workExperiences.map((w) =>
        w.id === id ? { ...w, ...patch } : w,
      ),
    });
  };
  const remove = (id: string) => {
    onChange({
      ...profile,
      workExperiences: profile.workExperiences.filter((w) => w.id !== id),
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <Briefcase className="size-5 text-primary/80" />
            工作经历
          </CardTitle>
          <CardDescription className="mt-1">
            职责 / 成就 / 项目可每行写一条；成就能带数字更好，AI 会据此润色。
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...profile,
              workExperiences: [...profile.workExperiences, createEmptyWork()],
            })
          }
        >
          <Plus className="size-4" />
          添加经历
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.workExperiences.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            还没有工作经历，点击右上角「添加经历」
          </p>
        )}
        {profile.workExperiences.map((work, index) => (
          <div
            key={work.id}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary/80">
                经历 {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(work.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="公司名称">
                <Input
                  value={work.company}
                  onChange={(e) => update(work.id, { company: e.target.value })}
                  placeholder="XX 科技有限公司"
                />
              </Field>
              <Field label="职位">
                <Input
                  value={work.title}
                  onChange={(e) => update(work.id, { title: e.target.value })}
                  placeholder="产品经理"
                />
              </Field>
              <Field label="开始时间">
                <Input
                  value={work.startDate}
                  onChange={(e) => update(work.id, { startDate: e.target.value })}
                  placeholder="2021.06"
                />
              </Field>
              <Field label="结束时间">
                <Input
                  value={work.endDate}
                  disabled={work.current}
                  onChange={(e) => update(work.id, { endDate: e.target.value })}
                  placeholder={work.current ? '至今' : '2023.08'}
                />
              </Field>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={work.current}
                onCheckedChange={(checked) =>
                  update(work.id, {
                    current: checked === true,
                    endDate: checked === true ? '' : work.endDate,
                  })
                }
              />
              目前仍在此任职
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Field label="主要职责（每行一条）">
                <Textarea
                  rows={3}
                  value={work.responsibilities}
                  onChange={(e) =>
                    update(work.id, { responsibilities: e.target.value })
                  }
                  placeholder={'负责……\n推动……\n协同……'}
                />
              </Field>
              <Field label="关键成就 / 量化结果（每行一条）" hint="尽量包含数字、比例或业务影响">
                <Textarea
                  rows={3}
                  value={work.achievements}
                  onChange={(e) =>
                    update(work.id, { achievements: e.target.value })
                  }
                  placeholder={'转化率从 3.2% 提升至 5.1%\n带领 3 人小组按期交付……'}
                />
              </Field>
              <Field label="参与项目（选填，每行一条）">
                <Textarea
                  rows={2}
                  value={work.projects}
                  onChange={(e) => update(work.id, { projects: e.target.value })}
                  placeholder="AI 写作助手、会员体系重构…"
                />
              </Field>
              <Field label="该段经历使用的技能（选填）">
                <Input
                  value={work.skills}
                  onChange={(e) => update(work.id, { skills: e.target.value })}
                  placeholder="数据分析、增长、A/B 测试"
                />
              </Field>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ---------------- 项目经历 ---------------- */

function ProjectList({
  profile,
  onChange,
}: {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const update = (id: string, patch: Partial<ProjectExperience>) => {
    onChange({
      ...profile,
      projects: profile.projects.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  };
  const remove = (id: string) => {
    onChange({
      ...profile,
      projects: profile.projects.filter((p) => p.id !== id),
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <FileText className="size-5 text-primary/80" />
            项目经历
            <span className="text-xs font-normal text-muted-foreground">（选填）</span>
          </CardTitle>
        </div>
        <div className="flex gap-2">
          {profile.projects.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '收起' : `展开（${profile.projects.length}）`}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExpanded(true);
              onChange({
                ...profile,
                projects: [...profile.projects, createEmptyProject()],
              });
            }}
          >
            <Plus className="size-4" />
            添加项目
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {profile.projects.map((project, index) => (
            <div
              key={project.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary/80">
                  项目 {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove(project.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="项目名称">
                  <Input
                    value={project.name}
                    onChange={(e) => update(project.id, { name: e.target.value })}
                    placeholder="AI 写作助手"
                  />
                </Field>
                <Field label="担任角色">
                  <Input
                    value={project.role}
                    onChange={(e) => update(project.id, { role: e.target.value })}
                    placeholder="产品负责人"
                  />
                </Field>
                <Field label="时间">
                  <Input
                    value={project.period}
                    onChange={(e) => update(project.id, { period: e.target.value })}
                    placeholder="2023.03 - 2023.12"
                  />
                </Field>
              </div>
              <div className="mt-3 space-y-3">
                <Field label="项目描述">
                  <Textarea
                    rows={2}
                    value={project.description}
                    onChange={(e) =>
                      update(project.id, { description: e.target.value })
                    }
                    placeholder="背景、目标与你的职责……"
                  />
                </Field>
                <Field label="项目成果">
                  <Textarea
                    rows={2}
                    value={project.achievements}
                    onChange={(e) =>
                      update(project.id, { achievements: e.target.value })
                    }
                    placeholder="上线 3 个月 40 万用户……"
                  />
                </Field>
                <Field label="技术 / 工具 / 方法论">
                  <Input
                    value={project.technologies}
                    onChange={(e) =>
                      update(project.id, { technologies: e.target.value })
                    }
                    placeholder="大模型应用、SQL、用户调研"
                  />
                </Field>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

/* ---------------- 教育经历 ---------------- */

function EducationList({
  profile,
  onChange,
}: {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}) {
  const update = (id: string, patch: Partial<EducationExperience>) => {
    onChange({
      ...profile,
      educations: profile.educations.map((ed) =>
        ed.id === id ? { ...ed, ...patch } : ed,
      ),
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <GraduationCap className="size-5 text-primary/80" />
          教育经历
          <span className="text-xs font-normal text-muted-foreground">（选填）</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...profile,
              educations: [...profile.educations, createEmptyEducation()],
            })
          }
        >
          <Plus className="size-4" />
          添加教育
        </Button>
      </CardHeader>
      {profile.educations.length > 0 && (
        <CardContent className="space-y-4">
          {profile.educations.map((edu) => (
            <div
              key={edu.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <Field label="学校">
                <Input
                  value={edu.school}
                  onChange={(e) => update(edu.id, { school: e.target.value })}
                  placeholder="XX 大学"
                />
              </Field>
              <Field label="学历">
                <Input
                  value={edu.degree}
                  onChange={(e) => update(edu.id, { degree: e.target.value })}
                  placeholder="本科 / 硕士"
                />
              </Field>
              <Field label="专业">
                <Input
                  value={edu.major}
                  onChange={(e) => update(edu.id, { major: e.target.value })}
                  placeholder="计算机科学"
                />
              </Field>
              <Field label="开始">
                <Input
                  value={edu.startDate}
                  onChange={(e) => update(edu.id, { startDate: e.target.value })}
                  placeholder="2015.09"
                />
              </Field>
              <Field label="结束">
                <Input
                  value={edu.endDate}
                  onChange={(e) => update(edu.id, { endDate: e.target.value })}
                  placeholder="2019.06"
                />
              </Field>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
