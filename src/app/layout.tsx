import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: {
    default: '职墨 AI · 精准简历与面试助手',
    template: '%s | 职墨 AI',
  },
  description:
    '上传简历或填写经历，结合目标岗位 JD，由 AI 生成针对性简历，并提供 STAR 结构化面试准备建议与技能短板分析。',
  keywords: [
    'AI 简历',
    '简历优化',
    'JD 匹配',
    '面试准备',
    'STAR 面试',
    '求职助手',
  ],
  authors: [{ name: 'ZhiMo AI' }],
  generator: 'Coze Code',
  openGraph: {
    title: '职墨 AI · 精准简历与面试助手',
    description:
      '基于你的真实经历与目标岗位 JD，生成针对性简历与 STAR 面试准备建议。',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <Toaster position="top-center" richColors={false} />
      </body>
    </html>
  );
}
