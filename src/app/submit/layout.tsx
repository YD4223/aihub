import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '提交AI工具 | AI Hub',
  description: '向AI Hub提交新的AI工具，经过审核后展示给全球用户，帮助更多人发现优秀AI产品。',
}

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
