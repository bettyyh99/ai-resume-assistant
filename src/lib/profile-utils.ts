import type {
  EducationExperience,
  ProjectExperience,
  TargetJob,
  UserProfile,
  WorkExperience,
} from '@/lib/types';

export function createEmptyProfile(): UserProfile {
  return {
    name: '',
    targetTitle: '',
    phone: '',
    email: '',
    location: '',
    yearsOfExperience: '',
    summary: '',
    skills: '',
    certifications: '',
    languages: '',
    website: '',
    workExperiences: [
      {
        id: crypto.randomUUID(),
        company: '',
        title: '',
        startDate: '',
        endDate: '',
        current: false,
        responsibilities: '',
        achievements: '',
        projects: '',
        skills: '',
      },
    ],
    projects: [],
    educations: [],
  };
}

export function createEmptyWork(): WorkExperience {
  return {
    id: crypto.randomUUID(),
    company: '',
    title: '',
    startDate: '',
    endDate: '',
    current: false,
    responsibilities: '',
    achievements: '',
    projects: '',
    skills: '',
  };
}

export function createEmptyProject(): ProjectExperience {
  return {
    id: crypto.randomUUID(),
    name: '',
    role: '',
    period: '',
    description: '',
    achievements: '',
    technologies: '',
  };
}

export function createEmptyEducation(): EducationExperience {
  return {
    id: crypto.randomUUID(),
    school: '',
    degree: '',
    major: '',
    startDate: '',
    endDate: '',
  };
}

export function createDefaultJob(): TargetJob {
  return {
    title: '',
    company: '',
    jd: '',
    length: 'standard',
    language: 'zh',
  };
}

/** 档案是否有足够生成内容 */
export function profileHasContent(profile: UserProfile): boolean {
  return Boolean(
    profile.summary.trim() ||
      profile.skills.trim() ||
      profile.workExperiences.some(
        (w) =>
          w.company.trim() ||
          w.title.trim() ||
          w.responsibilities.trim() ||
          w.achievements.trim() ||
          w.projects.trim(),
      ) ||
      profile.projects.some((p) => p.name.trim() || p.description.trim()),
  );
}

/** 填充一组示例数据，便于快速体验 */
export function createSampleProfile(): UserProfile {
  return {
    name: '林亦然',
    targetTitle: '高级产品经理',
    phone: '138-0000-1234',
    email: 'yiran.lin@example.com',
    location: '上海',
    yearsOfExperience: '5 年',
    website: 'linkedin.com/in/yiranlin',
    skills:
      '产品规划, 需求分析, 数据分析(SQL/Tableau), 用户增长, A/B 测试, 跨团队协作, Axure, 敏捷开发',
    certifications: 'PMP 项目管理认证（2022）\n公司年度优秀员工（2023）',
    languages: '英语 CET-6（可作为工作语言）',
    summary:
      '5 年互联网产品经验，主导过日活百万级工具类产品的增长与商业化，擅长数据驱动决策与 0-1 产品落地。',
    workExperiences: [
      {
        id: crypto.randomUUID(),
        company: '云栖科技有限公司',
        title: '产品经理 → 高级产品经理',
        startDate: '2021.06',
        endDate: '',
        current: true,
        responsibilities:
          '负责效率工具 App 的核心功能规划与迭代，管理 2 名产品经理\n对接研发、设计、运营团队，推动季度 OKR 落地\n搭建用户行为数据看板，建立功能复盘机制',
        achievements:
          '主导会员订阅体系改版，付费转化率从 3.2% 提升至 5.1%，年增收约 1200 万元\n推动新手引导流程优化，次日留存率提升 9 个百分点\n负责的核心功能覆盖日活用户 180 万',
        projects:
          'AI 写作助手（0-1 立项到上线，3 个月获取 40 万用户）\n会员订阅商业化体系重构',
        skills: '产品规划, 数据分析, 增长, A/B 测试, AI 产品',
      },
      {
        id: crypto.randomUUID(),
        company: '晨光网络',
        title: '产品经理',
        startDate: '2019.07',
        endDate: '2021.05',
        current: false,
        responsibilities:
          '负责电商营销中台的需求管理与迭代\n撰写 PRD 与原型，组织评审并跟进上线',
        achievements:
          '搭建优惠券发放系统，支撑日均 200 万张券的发放，运营配置效率提升 60%\n推动 12 个大促营销项目准时上线',
        projects: '电商营销中台、优惠券系统',
        skills: '需求分析, PRD, 营销产品, 项目管理',
      },
    ],
    projects: [
      {
        id: crypto.randomUUID(),
        name: 'AI 写作助手 0-1',
        role: '产品负责人',
        period: '2023.03 - 2023.12',
        description:
          '从用户调研出发定义 AI 写作产品方向，设计多场景写作模板与生成交互，协调算法与工程团队完成 MVP 与迭代。',
        achievements:
          '上线 3 个月用户突破 40 万，次月留存 34%；被集团评为季度创新项目。',
        technologies: '大模型应用, Prompt 工程, 数据分析, 用户调研',
      },
    ],
    educations: [
      {
        id: crypto.randomUUID(),
        school: '华东理工大学',
        degree: '本科',
        major: '信息管理与信息系统',
        startDate: '2015.09',
        endDate: '2019.06',
      },
    ],
  };
}
