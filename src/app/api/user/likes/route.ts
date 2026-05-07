import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/likes?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: '需要userId' }, { status: 400 })

    const records = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id, tool_data, liked_at FROM user_like_tools WHERE user_id = $1 ORDER BY liked_at DESC`,
      parseInt(userId)
    )

    const likes = records.map((r: any) => ({
      ...JSON.parse(r.tool_data),
      likedAt: r.liked_at?.toISOString?.() || r.liked_at
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
    const { userId, toolId, toolData, shareId } = await request.json()
    if (!userId || !toolId) return NextResponse.json({ error: '参数不完整' }, { status: 400 })

    const existing = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id FROM user_like_tools WHERE user_id = $1 AND tool_id = $2 LIMIT 1`,
      userId, toolId
    )

    if (Array.isArray(existing) && existing.length > 0) {
      await prisma.$executeRawUnsafe(`DELETE FROM user_like_tools WHERE id = $1`, existing[0].id)
      // 同步更新 shares 表的点赞数
      let newLikes = 0
      if (shareId) {
        const result = await prisma.$queryRawUnsafe<Array<any>>(
          `UPDATE shares SET likes = GREATEST(0, likes - 1) WHERE id = $1 RETURNING likes`,
          shareId
        )
        newLikes = Number(result[0]?.likes || 0)
      }
      return NextResponse.json({ liked: false, likes: newLikes })
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO user_like_tools (user_id, tool_id, tool_data) VALUES ($1, $2, $3)`,
      userId, toolId, JSON.stringify(toolData)
    )
    // 同步更新 shares 表的点赞数
    let newLikes = 0
    if (shareId) {
      const result = await prisma.$queryRawUnsafe<Array<any>>(
        `UPDATE shares SET likes = likes + 1 WHERE id = $1 RETURNING likes`,
        shareId
      )
      newLikes = Number(result[0]?.likes || 0)
    }
    return NextResponse.json({ liked: true, likes: newLikes })
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

    await prisma.$executeRawUnsafe(
      `DELETE FROM user_like_tools WHERE user_id = $1 AND tool_id = $2`,
      userId, toolId
    )
    return NextResponse.json({ message: '已删除' })
  } catch (error: any) {
    console.error('[Likes] DELETE错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
