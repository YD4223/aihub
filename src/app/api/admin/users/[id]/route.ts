import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'

// PATCH /api/admin/users/[id] - 封禁/解封用户
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const userId = parseInt(params.id)
    const body = await request.json()
    const { action, reason, duration, adminId } = body

    if (!action || !['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 })
    }

    if (action === 'ban') {
      // 封禁用户
      if (!reason) {
        return NextResponse.json({ error: '封禁原因不能为空' }, { status: 400 })
      }

      let bannedUntil = null
      
      // 计算解封时间（null表示永久封禁）
      if (duration && duration !== 'permanent') {
        const now = new Date()
        switch (duration) {
          case '1d':
            bannedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
            break
          case '3d':
            bannedUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
            break
          case '7d':
            bannedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            bannedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            bannedUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
            break
          case '365d':
            bannedUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            break
        }
      }

      await prisma.$executeRaw`
        UPDATE users 
        SET 
          status = 'banned',
          bannedAt = NOW(),
          bannedUntil = ${bannedUntil ? bannedUntil.toISOString() : null},
          bannedReason = ${reason},
          bannedBy = ${adminId || null},
          updatedAt = NOW()
        WHERE id = ${userId}
      `

      return NextResponse.json({ 
        success: true, 
        message: duration === 'permanent' ? '用户已永久封禁' : `用户已封禁至 ${bannedUntil?.toLocaleString('zh-CN')}`
      })
    } else {
      // 解封用户
      await prisma.$executeRaw`
        UPDATE users 
        SET 
          status = 'active',
          bannedAt = null,
          bannedUntil = null,
          bannedReason = null,
          bannedBy = null,
          updatedAt = NOW()
        WHERE id = ${userId}
      `

      return NextResponse.json({ success: true, message: '用户已解封' })
    }
  } catch (error: any) {
    console.error('操作用户失败:', error)
    return NextResponse.json({ error: '操作失败: ' + error.message }, { status: 500 })
  }
}

// GET /api/admin/users/[id] - 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const userId = parseInt(params.id)

    const user = await prisma.$queryRaw`
      SELECT 
        id, username, email, "avatarUrl", bio, location, website,
        role, status, "bannedAt", "bannedUntil", "bannedReason", "bannedBy",
        "createdAt", "updatedAt"
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (!Array.isArray(user) || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取用户统计数据（转 Number 防止 BigInt 序列化问题）
    const statsRaw = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM shares WHERE "userId" = ${userId}) as "sharesCount",
        (SELECT COUNT(*) FROM comments WHERE "userId" = ${userId}) as "commentsCount",
        (SELECT COUNT(*) FROM share_comments WHERE "userId" = ${userId}) as "shareCommentsCount"
    `
    const statsRow = (statsRaw as any[])[0] || {}
    const stats = {
      sharesCount: Number(statsRow.sharesCount || 0),
      commentsCount: Number(statsRow.commentsCount || 0),
      shareCommentsCount: Number(statsRow.shareCommentsCount || 0),
    }

    return NextResponse.json({
      user: user[0],
      stats
    })
  } catch (error: any) {
    console.error('获取用户详情失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
