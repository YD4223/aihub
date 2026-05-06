import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/likes?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: '需要userId' }, { status: 400 })

    const records = await (prisma as any).userLikeTool.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { likedAt: 'desc' }
    })

    const likes = records.map((r: any) => ({
      ...JSON.parse(r.toolData),
      likedAt: r.likedAt?.toISOString?.() || r.likedAt
    }))

    return NextResponse.json({ likes })
  } catch (error: any) {
    console.error('[Likes] GET错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/user/likes - 添加/取消点赞
export async function POST(request: NextRequest) {
  try {
    const { userId, toolId, toolData } = await request.json()
    if (!userId || !toolId) return NextResponse.json({ error: '参数不完整' }, { status: 400 })

    const existing = await (prisma as any).userLikeTool.findFirst({
      where: { userId, toolId }
    })

    if (existing) {
      await (prisma as any).userLikeTool.delete({ where: { id: existing.id } })
      return NextResponse.json({ liked: false })
    }

    await (prisma as any).userLikeTool.create({
      data: { userId, toolId, toolData: JSON.stringify(toolData) }
    })
    return NextResponse.json({ liked: true })
  } catch (error: any) {
    console.error('[Likes] POST错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/user/likes?userId=xxx&toolId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = parseInt(searchParams.get('userId') || '0')
    const toolId = parseInt(searchParams.get('toolId') || '0')
    if (!userId || !toolId) return NextResponse.json({ error: '参数不完整' }, { status: 400 })

    const existing = await (prisma as any).userLikeTool.findFirst({
      where: { userId, toolId }
    })
    if (existing) {
      await (prisma as any).userLikeTool.delete({ where: { id: existing.id } })
    }
    return NextResponse.json({ message: '已删除' })
  } catch (error: any) {
    console.error('[Likes] DELETE错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
