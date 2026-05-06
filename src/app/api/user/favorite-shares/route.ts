import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/favorite-shares?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: '需要userId' }, { status: 400 })

    const records = await (prisma as any).userFavoriteShare.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { addedAt: 'desc' }
    })

    const shares = records.map((r: any) => ({
      ...JSON.parse(r.shareData),
      addedAt: r.addedAt?.toISOString?.() || r.addedAt
    }))

    return NextResponse.json({ shares })
  } catch (error: any) {
    console.error('[FavoriteShares] GET错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/user/favorite-shares - 添加/取消收藏分享
export async function POST(request: NextRequest) {
  try {
    const { userId, shareId, shareData } = await request.json()
    if (!userId || !shareId) return NextResponse.json({ error: '参数不完整' }, { status: 400 })

    const existing = await (prisma as any).userFavoriteShare.findFirst({
      where: { userId, shareId }
    })

    if (existing) {
      await (prisma as any).userFavoriteShare.delete({ where: { id: existing.id } })
      return NextResponse.json({ favorited: false })
    }

    await (prisma as any).userFavoriteShare.create({
      data: { userId, shareId, shareData: JSON.stringify(shareData) }
    })
    return NextResponse.json({ favorited: true })
  } catch (error: any) {
    console.error('[FavoriteShares] POST错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/user/favorite-shares?userId=xxx&shareId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = parseInt(searchParams.get('userId') || '0')
    const shareId = parseInt(searchParams.get('shareId') || '0')
    if (!userId || !shareId) return NextResponse.json({ error: '参数不完整' }, { status: 400 })

    const existing = await (prisma as any).userFavoriteShare.findFirst({
      where: { userId, shareId }
    })
    if (existing) {
      await (prisma as any).userFavoriteShare.delete({ where: { id: existing.id } })
    }
    return NextResponse.json({ message: '已删除' })
  } catch (error: any) {
    console.error('[FavoriteShares] DELETE错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
