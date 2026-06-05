import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canComment, incrementCommentCount } from '@/lib/daily-limit'
import { createNotification } from '@/lib/notification'
import { addExp } from '@/lib/add-exp'
import { EXP_RULES } from '@/lib/level'
import { checkAndUnlock } from '@/lib/check-achievements'
import { generateAIReply, shouldAIReply, shouldAILike } from '@/lib/ai-service'

// GET /api/shares/[id]/comments - 获取分享的评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const shareId = parseInt(params.id)

  if (isNaN(shareId)) {
    return NextResponse.json({ error: '无效的分享ID' }, { status: 400 })
  }

  try {
    const comments = await prisma.$queryRaw`
      SELECT 
        c.*,
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        u.role as "userRole",
        pu.username as "parentUserName"
      FROM share_comments c
      LEFT JOIN users u ON c."userId" = u.id
      LEFT JOIN share_comments pc ON c."parentId" = pc.id
      LEFT JOIN users pu ON pc."userId" = pu.id
      WHERE c."shareId" = ${shareId}
        AND (c.status IS NULL OR c.status = 'approved')
      ORDER BY c."createdAt" DESC
    `

    return NextResponse.json({ comments })
  } catch (error: any) {
    console.error('获取评论失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}

// POST /api/shares/[id]/comments - 发表评论
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const shareId = parseInt(params.id)

  if (isNaN(shareId)) {
    return NextResponse.json({ error: '无效的分享ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { content, userId = 1, parentId } = body

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
    }

    // 检查用户评论次数限制
    const { allowed, remaining } = await canComment(userId)
    if (!allowed) {
      return NextResponse.json({ 
        error: `今日评论次数已达上限（每天5次），请明天再试` 
      }, { status: 429 })
    }

    // 创建评论到 share_comments 表
    if (parentId) {
      // 回复评论
      await prisma.$executeRaw`
        INSERT INTO share_comments (content, "userId", "shareId", "parentId", "createdAt", "updatedAt")
        VALUES (${content.trim()}, ${userId}, ${shareId}, ${parentId}, NOW(), NOW())
      `
    } else {
      // 主评论
      await prisma.$executeRaw`
        INSERT INTO share_comments (content, "userId", "shareId", "createdAt", "updatedAt")
        VALUES (${content.trim()}, ${userId}, ${shareId}, NOW(), NOW())
      `
    }

    // 获取刚创建的评论
    const newComment = await prisma.$queryRaw`
      SELECT 
        c.*,
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        u.role as "userRole",
        pu.username as "parentUserName"
      FROM share_comments c
      LEFT JOIN users u ON c."userId" = u.id
      LEFT JOIN share_comments pc ON c."parentId" = pc.id
      LEFT JOIN users pu ON pc."userId" = pu.id
      WHERE c."shareId" = ${shareId}
      ORDER BY c."createdAt" DESC
      LIMIT 1
    `

    const comment = (newComment as any[])[0]

    // 增加用户评论次数
    await incrementCommentCount(userId)
    // 评论加经验
    addExp(Number(userId), EXP_RULES.CREATE_COMMENT).catch(() => {})
    // 成就检查
    checkAndUnlock(Number(userId)).catch(() => {})

    // 发送通知给分享作者
    try {
      const shareOwner = await prisma.$queryRaw<Array<{ userId: number }>>`
        SELECT "userId" FROM shares WHERE id = ${shareId}
      `
      const ownerId = (shareOwner as any[])[0]?.userId
      if (ownerId && Number(ownerId) !== Number(userId)) {
        const notifyTitle = parentId ? '有人回复了你的评论' : '有人评论了你的分享'
        createNotification({
          userId: ownerId,
          type: 'comment',
          title: notifyTitle,
          content: content.trim().substring(0, 100),
          link: `/share/${shareId}`,
          relatedUserId: Number(userId),
        }).catch(() => {})
      }
    } catch (e) {
      console.error('评论通知失败:', e)
    }

    // 触发 AI 自动互动（异步，不阻塞响应）
    const doAIInteract = async () => {
      try {
        const aiUser = await prisma.$queryRaw<Array<any>>`SELECT id FROM users WHERE username = 'AI助手' LIMIT 1`
        if (!aiUser.length) return
        const aiUserId = aiUser[0].id

        // 自动点赞
        if (shouldAILike()) {
          const existingLike = await prisma.$queryRaw<Array<any>>`
            SELECT * FROM ai_interactions WHERE targetType = 'share_comment' AND targetId = ${comment.id} AND action = 'like' LIMIT 1
          `
          if (!existingLike.length) {
            await prisma.$executeRaw`UPDATE share_comments SET likes = likes + 1 WHERE id = ${comment.id}`
            await prisma.$executeRaw`
              INSERT INTO ai_interactions (targetType, targetId, action, aiUserId, createdAt)
              VALUES ('share_comment', ${comment.id}, 'like', ${aiUserId}, NOW())
            `
          }
        }

        // 自动回复
        if (shouldAIReply()) {
          const existingReply = await prisma.$queryRaw<Array<any>>`
            SELECT * FROM ai_interactions WHERE targetType = 'share_comment' AND targetId = ${comment.id} AND action = 'reply' LIMIT 1
          `
          if (!existingReply.length) {
            const aiResponse = await generateAIReply({
              content: content.trim(),
              contentType: 'share_comment',
              authorName: comment.userName || '用户'
            })
            await prisma.$executeRaw`
              INSERT INTO share_comments (content, userId, shareId, parentId, createdAt, updatedAt)
              VALUES (${aiResponse.reply}, ${aiUserId}, ${shareId}, ${comment.id}, NOW(), NOW())
            `
            await prisma.$executeRaw`
              INSERT INTO ai_interactions (targetType, targetId, action, content, aiUserId, createdAt)
              VALUES ('share_comment', ${comment.id}, 'reply', ${aiResponse.reply}, ${aiUserId}, NOW())
            `
          }
        }
      } catch (err) {
        console.error('AI 互动失败:', err)
      }
    }
    doAIInteract()

    return NextResponse.json({ comment })
  } catch (error: any) {
    console.error('发表评论失败:', error)
    return NextResponse.json({ error: '发表失败: ' + error.message }, { status: 500 })
  }
}
