import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canLike, incrementLikeCount } from '@/lib/daily-limit'
import { createNotification } from '@/lib/notification'
import { addExp } from '@/lib/add-exp'
import { EXP_RULES } from '@/lib/level'
import { checkAndUnlock } from '@/lib/check-achievements'
import { requireUser } from '@/lib/auth'

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
    // 会话归属校验：点赞人身份以会话为准（防冒名点赞）
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    // 检查点赞次数限制
    const { allowed, remaining } = await canLike(userId)
    if (!allowed) {
      return NextResponse.json({ 
        error: `今日点赞次数已达上限（每天5次），请明天再试` 
      }, { status: 429 })
    }

    // 获取当前评论（包含用户信息）
    const comment = await prisma.$queryRaw`
      SELECT likes, "userId" FROM share_comments WHERE id = ${commentId}
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

    // 通知评论作者有人点赞（异步）
    const commentOwnerId = (comment as any[])[0]?.userId
    if (commentOwnerId && Number(commentOwnerId) !== Number(userId)) {
      createNotification({
        userId: commentOwnerId,
        type: 'like',
        title: '有人赞了你的评论',
        content: '',
        link: `/user-share`,
        relatedUserId: Number(userId),
      }).catch(() => {})
      // 评论获赞加经验
      addExp(Number(commentOwnerId), EXP_RULES.GET_LIKE_ON_COMMENT).catch(() => {})
      // 成就检查
      checkAndUnlock(Number(commentOwnerId)).catch(() => {})
    }

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
