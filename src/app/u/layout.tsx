import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '用户主页 | AI Hub',
  description: '查看AI Hub用户的个人主页，了解他们的分享、收藏和社区贡献。',
}

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
