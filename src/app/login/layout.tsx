import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录 / 注册 | AI Hub',
  description: '登录或注册 AI Hub 账号，加入AI工具社区，分享你的AI工具使用体验。',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
