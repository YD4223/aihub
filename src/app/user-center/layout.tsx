import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '个人中心 | AI Hub',
  description: '管理你的AI Hub账号信息、收藏的工具、发布的分享和评论记录。',
}

export default function UserCenterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
