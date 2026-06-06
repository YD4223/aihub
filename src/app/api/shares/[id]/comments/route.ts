import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canComment, incrementCommentCount } from '@/lib/daily-limit'
import { createNotification } from '@/lib/notification'
import { addExp } from '@/lib/add-exp'
import { EXP_RULES } from '@/lib/level'
import { checkAndUnlock } from '@/lib/check-achievements'
import sanitizeHtml from 'sanitize-html'

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
    let { content, userId = 1, parentId } = body

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

    // 消毒用户输入
    content = sanitizeHtml(content.trim(), { allowedTags: [], allowedAttributes: {} })

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


    return NextResponse.json({ comment })
  } catch (error: any) {
    console.error('发表评论失败:', error)
    return NextResponse.json({ error: '发表失败: ' + error.message }, { status: 500 })
  }
}
