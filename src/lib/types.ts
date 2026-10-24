/** 用户档案：结构化的过往工作经验 */
export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string; // 空字符串表示至今
  current: boolean;
  responsibilities: string; // 主要职责（每行一条）
  achievements: string; // 关键成就（每行一条）
  projects: string; // 参与项目（每行一条）
  skills: string; // 该段经历使用的技能（逗号分隔）
}

export interface ProjectExperience {
  id: string;
  name: string;
  role: string;
  period: string;
  description: string;
  achievements: string;
  technologies: string;
}

export interface EducationExperience {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
}

export interface UserProfile {
  name: string;
  targetTitle: string;
  phone: string;
  email: string;
  location: string;
  yearsOfExperience: string;
  summary: string; // 个人简介 / 自我评价
  skills: string; // 技能标签，逗号或顿号分隔
  certifications: string; // 证书/奖项（每行一条）
  languages: string; // 语言能力
  website: string; // 作品集/主页
  workExperiences: WorkExperience[];
  projects: ProjectExperience[];
  educations: EducationExperience[];
}

export interface TargetJob {
  title: string;
  company: string;
  jd: string;
  /** 篇幅倾向：one-page 精简 / standard 标准 / two-page 详细 */
  length: 'one-page' | 'standard' | 'two-page';
  /** 语言：zh / en */
  language: 'zh' | 'en';
}

export interface ParseResult {
  profile: UserProfile;
  rawText: string;
  warnings: string[];
}

/** 面试建议结构化结果 */
export interface InterviewPrep {
  overview: string;
  questions: InterviewQuestion[];
  skillGaps: SkillGap[];
  preparationPoints: string[];
}

export interface InterviewQuestion {
  question: string;
  category: string; // 行为 / 技术 / 项目 / 岗位认知 / 反问
  star: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  tips: string;
}

export interface SkillGap {
  skill: string;
  level: 'high' | 'medium' | 'low';
  reason: string;
  advice: string;
}

export type WizardStep = 1 | 2 | 3 | 4;
