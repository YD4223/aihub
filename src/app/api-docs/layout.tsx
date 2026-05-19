import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API 文档 | AI Hub',
  description: 'AI Hub 开放API接口文档，开发者可调用工具数据、资讯内容等，构建你自己的AI工具导航。',
}

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
