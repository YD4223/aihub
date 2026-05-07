import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canComment, incrementCommentCount } from '@/lib/daily-limit'

// GET /api/tools/[id]/comments - 获取工具的评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const toolId = parseInt(params.id)

  if (isNaN(toolId)) {
    return NextResponse.json({ error: '无效的工具ID' }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // 直接查询 comments 表中 toolId 匹配的记录，只显示正常状态的评论
    const comments = await prisma.$queryRaw`
      SELECT 
        c.*,
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        u.role as "userRole"
      FROM comments c
      LEFT JOIN users u ON c."userId" = u.id
      WHERE c."toolId" = ${toolId}
        AND (c.status IS NULL OR c.status = 'approved')
      ORDER BY c."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `

    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM comments 
      WHERE "toolId" = ${toolId} 
        AND (status IS NULL OR status = 'approved')
    `
    const total = Number((totalResult as any)[0].count)

    return NextResponse.json({ 
      comments: comments || [],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('获取工具评论失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}

// POST /api/tools/[id]/comments - 给工具发表评论
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const toolId = parseInt(params.id)

  if (isNaN(toolId)) {
    return NextResponse.json({ error: '无效的工具ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { content, userId = 1 } = body

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

    // 创建评论到 comments 表，使用 toolId 字段
    await prisma.$executeRaw`
      INSERT INTO comments (content, "userId", "toolId", "targetType", "createdAt", "updatedAt")
      VALUES (${content.trim()}, ${userId}, ${toolId}, 'tool', NOW(), NOW())
    `

    // 获取刚创建的评论
    const newComment = await prisma.$queryRaw`
      SELECT 
        c.*,
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        u.role as "userRole",
        t.name as "toolName"
      FROM comments c
      LEFT JOIN users u ON c."userId" = u.id
      LEFT JOIN tools t ON c."toolId" = t.id
      WHERE c."toolId" = ${toolId}
      ORDER BY c."createdAt" DESC
      LIMIT 1
    `

    const comment = (newComment as any[])[0]

    // 增加用户评论次数
    await incrementCommentCount(userId)

    // 触发 AI 自动互动（异步，不阻塞响应）
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/ai/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'comment',
          targetId: comment.id,
          content: content.trim(),
          authorName: comment.userName || '用户',
          authorId: userId,
          context: comment.toolName || undefined
        })
      }).catch(err => console.error('AI 互动触发失败:', err))
    } catch (e) {
      console.error('AI 互动触发异常:', e)
    }

    return NextResponse.json({ comment })
  } catch (error: any) {
    console.error('发表工具评论失败:', error)
    return NextResponse.json({ error: '发表失败: ' + error.message }, { status: 500 })
  }
}
