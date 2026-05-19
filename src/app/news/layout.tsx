import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI资讯 | AI Hub',
  description: '每日更新最新AI行业资讯，涵盖大模型动态、AI应用落地、技术突破等热点信息。',
}

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
