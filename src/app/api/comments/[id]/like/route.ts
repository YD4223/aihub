import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canLike, incrementLikeCount } from '@/lib/daily-limit'

// POST /api/comments/[id]/like - 点赞/取消点赞评论
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const commentId = parseInt(params.id)

  if (isNaN(commentId)) {
    return NextResponse.json({ error: '无效的评论ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { userId = 1 } = body

    // 检查点赞次数限制
    const { allowed, remaining } = await canLike(userId)
    if (!allowed) {
      return NextResponse.json({ 
        error: `今日点赞次数已达上限（每天5次），请明天再试` 
      }, { status: 429 })
    }

    // 获取当前评论
    const comment = await prisma.$queryRaw`
      SELECT likes FROM share_comments WHERE id = ${commentId}
    `
    
    if (!(comment as any[]).length) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 })
    }

    // 这里简化处理：直接增加点赞数
    // 实际项目中应该使用用户ID来记录谁点赞了，防止重复点赞
    await prisma.$executeRaw`
      UPDATE share_comments 
      SET likes = likes + 1 
      WHERE id = ${commentId}
    `

    // 增加用户点赞次数
    await incrementLikeCount(userId)

    // 获取更新后的点赞数
    const updated = await prisma.$queryRaw`
      SELECT likes FROM share_comments WHERE id = ${commentId}
    `

    return NextResponse.json({ 
      success: true, 
      likes: (updated as any[])[0].likes,
      isLiked: true 
    })
  } catch (error: any) {
    console.error('点赞失败:', error)
    return NextResponse.json({ error: '点赞失败: ' + error.message }, { status: 500 })
  }
}
