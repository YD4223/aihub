import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/user/comments?userId=1&page=1&limit=20
export async function GET(request: NextRequest) {
  // 会话归属校验：只能查看自己的评论
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const userId = parseInt(searchParams.get('userId') || '0')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  if (!userId) {
    return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
  }

  if (auth.userId !== userId) {
    return NextResponse.json({ error: '无权查看该用户的评论' }, { status: 403 })
  }

  try {
    // 获取用户的 share_comments（包含关联的分享信息）
    const comments = await prisma.$queryRaw<
      Array<{
        id: number
        content: string
        shareId: number
        shareContent: string
        shareType: string
        parentId: number | null
        createdAt: Date
        status: string
      }>
    >`
      SELECT 
        sc.id, sc.content, sc."shareId",
        s.content as "shareContent",
        s.type as "shareType",
        sc."parentId", sc."createdAt", sc.status
      FROM share_comments sc
      LEFT JOIN shares s ON sc."shareId" = s.id
      WHERE sc."userId" = ${userId}
      ORDER BY sc."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `

    const totalResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM share_comments WHERE "userId" = ${userId}
    `

    return NextResponse.json({
      comments,
      total: Number(totalResult[0]?.count || 0),
      page,
      limit,
    })
  } catch (error: any) {
    console.error('获取用户评论失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}

// DELETE /api/user/comments - 删除用户的评论
export async function DELETE(request: NextRequest) {
  try {
    // 会话归属校验：只能删除自己的评论
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { commentId, userId } = body

    if (!commentId || !userId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    if (auth.userId !== parseInt(userId)) {
      return NextResponse.json({ error: '无权删除该评论' }, { status: 403 })
    }

    await prisma.$executeRaw`
      DELETE FROM share_comments WHERE id = ${commentId} AND "userId" = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除评论失败:', error)
    return NextResponse.json({ error: '删除失败: ' + error.message }, { status: 500 })
  }
}
