import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/favorite-shares?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: '需要userId' }, { status: 400 })

    const records = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id, share_data, added_at FROM user_favorite_shares WHERE user_id = $1 ORDER BY added_at DESC`,
      parseInt(userId)
    )

    const shares = records.map((r: any) => ({
      ...JSON.parse(r.share_data),
      addedAt: r.added_at?.toISOString?.() || r.added_at
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

    const existing = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id FROM user_favorite_shares WHERE user_id = $1 AND share_id = $2 LIMIT 1`,
      userId, shareId
    )

    if (Array.isArray(existing) && existing.length > 0) {
      await prisma.$executeRawUnsafe(`DELETE FROM user_favorite_shares WHERE id = $1`, existing[0].id)
      return NextResponse.json({ favorited: false })
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO user_favorite_shares (user_id, share_id, share_data) VALUES ($1, $2, $3)`,
      userId, shareId, JSON.stringify(shareData)
    )
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

    await prisma.$executeRawUnsafe(
      `DELETE FROM user_favorite_shares WHERE user_id = $1 AND share_id = $2`,
      userId, shareId
    )
    return NextResponse.json({ message: '已删除' })
  } catch (error: any) {
    console.error('[FavoriteShares] DELETE错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
