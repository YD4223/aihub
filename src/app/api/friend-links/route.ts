import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 强制动态渲染，不缓存
export const dynamic = 'force-dynamic'

export const dynamic = 'force-dynamic'

// GET /api/friend-links - 获取启用的友情链接（公开）
export async function GET() {
  try {
    const links = await prisma.friendLink.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        sortOrder: true,
      },
    })
    return NextResponse.json({ links })
  } catch (error: any) {
    console.error('[Public FriendLinks] GET错误:', error)
    return NextResponse.json({ links: [] })
  }
}
