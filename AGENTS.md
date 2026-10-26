# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 业务模块：AI 精准简历与面试助手

四步向导单页应用（录入经验 → 选岗位 → 生成简历 → 面试建议），状态集中在 `src/app/page.tsx`，分步组件位于 `src/components/steps/`。

### 关键目录

```
src/
├── app/
│   ├── page.tsx                     # 向导主页（步骤状态机 + profile/job 状态）
│   └── api/
│       ├── resume/parse/route.ts    # POST multipart：上传 PDF/Word/TXT → 结构化 UserProfile
│       ├── resume/generate/route.ts # POST JSON：SSE 流式生成定向简历 Markdown
│       └── interview/generate/route.ts # POST JSON：SSE 流式生成面试准备建议
├── components/
│   ├── stepper.tsx                  # 四步进度指示
│   ├── markdown-renderer.tsx        # 零依赖 Markdown 渲染（解析见 lib/markdown-parse.ts）
│   └── steps/
│       ├── step-profile.tsx         # 步骤1：文件上传解析 + 在线表单
│       ├── step-job.tsx             # 步骤2：目标岗位 + JD
│       ├── step-resume.tsx          # 步骤3：流式生成 + A4 预览 + 编辑 + 导出
│       └── step-interview.tsx       # 步骤4：STAR 面试建议（问答卡片展开）
├── lib/
│   ├── types.ts                     # UserProfile / WorkExperience / JobInput 等领域类型
│   ├── sse-client.ts                # 前端 SSE reader（解析 data: 行）
│   ├── history-storage.ts           # localStorage 历史简历（≤5）/ 历史岗位（≤8）
│   ├── profile-utils.ts             # 空对象工厂 / 本地化 / 校验
│   ├── markdown-parse.ts            # 极简 Markdown → BlockNode 解析器
│   └── export-docx.ts               # docx 库导出 Word（blob → 下载）
└── server/
    ├── llm-client.ts                # coze-coding-dev-sdk ChatClient 封装（仅服务端）
    └── prompts.ts                   # 简历生成 / 面试建议 / 简历解析 prompt
```

### 集成说明

- 统一使用 `coze-coding-dev-sdk`（**只能在服务端 route 内调用**）：
  - `ChatClient`：大模型，默认模型 `doubao-seed-2-0-lite-260215`（常量 `DEFAULT_MODEL` 在 `server/llm-client.ts`，配额允许时可切回 pro）。
  - `FetchClient`：PDF/Word 正文抽取（TXT 直接 `file.text()`，不走该服务）。
  - `S3Storage`：上传文件临时存放 → 预签名 URL → 解析后删除。
  - 所有客户端构造必须透传 `HeaderUtils.extractForwardHeaders(request.headers)`。
- 生成类接口为 **SSE 流式**：事件类型 `status | delta | complete | error`，前端用 `lib/sse-client.ts` 读取；改动协议需前后端同步。
- 简历模型输出为 Markdown（标题 `#` 姓名、`##` 版块），预览/导出共用同一份 Markdown。

### 导出能力

- Word：`docx` 库客户端生成 `.docx`；PDF：打印样式 `@media print` 调 `window.print()` 另存；Markdown：Blob 下载 `.md`。
- 跨域资源下载必须 fetch+blob（本项目导出内容均为本地生成）。

### 本地历史记录

- 存浏览器 `localStorage`（key：`zhimo-resume-history-v1` / `zhimo-job-history-v1`），不走服务端。
- 历史简历最多 5 份：上传解析成功自动存入（`source: upload`），表单模式可手动存入（`manual`）；StepProfile 内可一键载入/删除。
- 历史岗位最多 8 个：第 2 步点击「生成定制简历」时自动保存（page 层 `jobSaveTick` 驱动）；StepJob 内可一键复用/删除。
- 内容指纹去重（简历：姓名+意向+首段工作+技能；岗位：标题+公司+JD），重复时置顶更新；超限淘汰最旧。

### 已知限制

- 沙箱开发账户可能返回「资源点不足 / balance overdue」，属账户配额问题而非代码缺陷；`resume/parse` 对 TXT 已做降级（LLM 不可用时保留原文到 summary 并返回 warnings）。
- 扫描件/图片版 PDF 无法抽取文字，接口返回 422 引导用户改用表单。
