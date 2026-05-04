import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAIReply, shouldAIReply, shouldAILike } from '@/lib/ai-service'

/**
 * POST /api/ai/interact
 * AI 自动互动接口 - 点赞 + 智能回复
 * 
 * 调用时机：用户发布内容后自动触发
 * 支持内容类型：share(分享)、share_comment(分享评论)、comment(工具评论)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetType, targetId, content, authorName, authorId, context } = body

    // 验证参数
    if (!targetType || !targetId || !content || !authorName) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 获取或创建 AI 用户
    let aiUser = await prisma.$queryRaw`
      SELECT * FROM users WHERE username = 'AI助手' LIMIT 1
    `
    
    if (!(aiUser as any[]).length) {
      // 创建 AI 用户
      const newUser = await prisma.$queryRaw`
        INSERT INTO users (username, email, password, avatarUrl, role, createdAt, updatedAt)
        VALUES ('AI助手', 'ai@aihub.local', 'ai-bot-password', '/avatars/ai-lobster.svg', 'BOT', NOW(), NOW())
        RETURNING *
      `
      aiUser = newUser
    }
    
    const aiUserId = (aiUser as any[])[0].id
    const results: { liked?: boolean; replied?: boolean; reply?: string } = {}

    // 1. AI 自动点赞
    if (shouldAILike()) {
      // 检查是否已经点过赞
      const existingLike = await prisma.$queryRaw`
        SELECT * FROM ai_interactions 
        WHERE targetType = ${targetType} 
          AND targetId = ${parseInt(targetId)} 
          AND action = 'like'
        LIMIT 1
      `
      
      if (!(existingLike as any[]).length) {
        // 根据内容类型选择点赞表
        if (targetType === 'share') {
          // 检查 shares 表是否有 likes 字段，需要更新
          await prisma.$executeRaw`
            UPDATE shares SET likes = likes + 1 WHERE id = ${parseInt(targetId)}
          `
        } else if (targetType === 'share_comment') {
          await prisma.$executeRaw`
            UPDATE share_comments SET likes = likes + 1 WHERE id = ${parseInt(targetId)}
          `
        } else if (targetType === 'comment') {
          await prisma.$executeRaw`
            UPDATE comments SET upvotes = upvotes + 1 WHERE id = ${parseInt(targetId)}
          `
        }

        // 记录 AI 互动
        await prisma.$executeRaw`
          INSERT INTO ai_interactions (targetType, targetId, action, aiUserId, createdAt)
          VALUES (${targetType}, ${parseInt(targetId)}, 'like', ${aiUserId}, NOW())
        `

        results.liked = true
      }
    }

    // 2. AI 智能回复
    if (shouldAIReply()) {
      // 检查是否已经回复过
      const existingReply = await prisma.$queryRaw`
        SELECT * FROM ai_interactions 
        WHERE targetType = ${targetType} 
          AND targetId = ${parseInt(targetId)} 
          AND action = 'reply'
        LIMIT 1
      `
      
      if (!(existingReply as any[]).length) {
        // 生成 AI 回复
        const aiResponse = await generateAIReply({
          content,
          contentType: targetType as any,
          authorName,
          context
        })

        // 根据内容类型插入回复
        if (targetType === 'share') {
          await prisma.$executeRaw`
            INSERT INTO share_comments (content, userId, shareId, createdAt, updatedAt)
            VALUES (${aiResponse.reply}, ${aiUserId}, ${parseInt(targetId)}, NOW(), NOW())
          `
        } else if (targetType === 'share_comment') {
          // 回复评论时，需要找到对应的 shareId
          const parentComment = await prisma.$queryRaw`
            SELECT shareId FROM share_comments WHERE id = ${parseInt(targetId)}
          `
          const shareId = (parentComment as any[])[0]?.shareId
          if (shareId) {
            await prisma.$executeRaw`
              INSERT INTO share_comments (content, userId, shareId, parentId, createdAt, updatedAt)
              VALUES (${aiResponse.reply}, ${aiUserId}, ${shareId}, ${parseInt(targetId)}, NOW(), NOW())
            `
          }
        } else if (targetType === 'comment') {
          // 工具评论的回复
          const parentComment = await prisma.$queryRaw`
            SELECT toolId FROM comments WHERE id = ${parseInt(targetId)}
          `
          const toolId = (parentComment as any[])[0]?.toolId
          if (toolId) {
            await prisma.$executeRaw`
              INSERT INTO comments (content, userId, toolId, parentId, targetType, createdAt, updatedAt)
              VALUES (${aiResponse.reply}, ${aiUserId}, ${toolId}, ${parseInt(targetId)}, 'tool', NOW(), NOW())
            `
          }
        }

        // 记录 AI 互动
        await prisma.$executeRaw`
          INSERT INTO ai_interactions (targetType, targetId, action, content, aiUserId, createdAt)
          VALUES (${targetType}, ${parseInt(targetId)}, 'reply', ${aiResponse.reply}, ${aiUserId}, NOW())
        `

        results.replied = true
        results.reply = aiResponse.reply
      }
    }

    return NextResponse.json({
      success: true,
      message: 'AI 互动完成',
      results,
      aiUserId
    })

  } catch (error: any) {
    console.error('AI 互动失败:', error)
    return NextResponse.json(
      { error: 'AI 互动失败: ' + error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/interact
 * 获取 AI 互动统计
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        action,
        COUNT(*) as count
      FROM ai_interactions
      GROUP BY action
    `

    const recent = await prisma.$queryRaw`
      SELECT 
        ai.*,
        u.username as aiUserName,
        u.avatarUrl as aiUserAvatar
      FROM ai_interactions ai
      LEFT JOIN users u ON ai.aiUserId = u.id
      ORDER BY ai.createdAt DESC
      LIMIT 20
    `

    return NextResponse.json({
      stats,
      recent
    })
  } catch (error: any) {
    console.error('获取 AI 互动统计失败:', error)
    return NextResponse.json(
      { error: '获取失败: ' + error.message },
      { status: 500 }
    )
  }
}