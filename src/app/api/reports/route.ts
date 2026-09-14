import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'

// POST /api/reports - 提交举报
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, targetId, reason, description } = body

    // 举报人身份一律以会话为准（防伪造）；未登录则记为匿名（reporterId = null）
    const token = request.cookies.get('auth_token')?.value
    let reporterId: number | null = null
    if (token) {
      const rows = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT id FROM users WHERE "sessionToken" = $1 LIMIT 1`,
        token
      )
      if (Array.isArray(rows) && rows.length > 0) reporterId = rows[0].id
    }

    // 验证必填字段
    if (!type || !targetId || !reason) {
      return NextResponse.json(
        { error: '缺少必填字段：type, targetId, reason' },
        { status: 400 }
      )
    }

    // 验证举报类型
    const validTypes = ['tool', 'share', 'comment', 'share_comment']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: '无效的举报类型' },
        { status: 400 }
      )
    }

    // 验证举报原因
    const validReasons = [
      '垃圾广告',
      '违法违规',
      '侵权盗版',
      '虚假信息',
      '恶意攻击',
      '其他问题'
    ]
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: '无效的举报原因' },
        { status: 400 }
      )
    }

    // 检查目标是否存在
    let targetExists = false
    if (type === 'tool') {
      const tool = await prisma.$queryRaw`SELECT id FROM tools WHERE id = ${parseInt(targetId)}`
      targetExists = (tool as any[]).length > 0
    } else if (type === 'share') {
      const share = await prisma.$queryRaw`SELECT id FROM shares WHERE id = ${parseInt(targetId)}`
      targetExists = (share as any[]).length > 0
    } else if (type === 'comment') {
      const comment = await prisma.$queryRaw`SELECT id FROM comments WHERE id = ${parseInt(targetId)}`
      targetExists = (comment as any[]).length > 0
    } else if (type === 'share_comment') {
      const comment = await prisma.$queryRaw`SELECT id FROM share_comments WHERE id = ${parseInt(targetId)}`
      targetExists = (comment as any[]).length > 0
    }

    if (!targetExists) {
      return NextResponse.json(
        { error: '举报的目标不存在' },
        { status: 404 }
      )
    }

    // 检查是否已举报过（同一用户、同一目标、未处理的举报）
    if (reporterId) {
      const existingReport = await prisma.$queryRaw`
        SELECT id FROM reports 
        WHERE type = ${type} 
          AND targetId = ${parseInt(targetId)}
          AND reporterId = ${parseInt(String(reporterId))}
          AND status = 'pending'
      `
      if ((existingReport as any[]).length > 0) {
        return NextResponse.json(
          { error: '您已经举报过此内容，请等待处理' },
          { status: 400 }
        )
      }
    }

    // 创建举报记录
    await prisma.$executeRaw`
      INSERT INTO reports (type, targetId, reason, description, reporterId, status, createdAt, updatedAt)
      VALUES (
        ${type}, 
        ${parseInt(targetId)}, 
        ${reason}, 
        ${description || null}, 
        ${reporterId}, 
        'pending',
        NOW(), 
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: '举报提交成功，我们会尽快处理'
    })
  } catch (error: any) {
    console.error('提交举报失败:', error)
    return NextResponse.json(
      { error: '提交失败: ' + error.message },
      { status: 500 }
    )
  }
}

// GET /api/reports - 获取举报列表（管理后台，仅管理员）
export async function GET(request: NextRequest) {
  try {
    // 管理后台数据，仅管理员可访问
    const auth = await verifyAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status') || 'pending'
    // 白名单校验，杜绝 status 拼接导致的 SQL 注入
    const allowedStatus = ['pending', 'resolved', 'dismissed', 'all']
    const status = allowedStatus.includes(statusParam) ? statusParam : 'pending'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const skip = (page - 1) * limit

    // 参数化 WHERE（status 走 $1 绑定）
    const whereParams: any[] = []
    let whereClause = ''
    if (status !== 'all') {
      whereClause = 'WHERE r.status = $1'
      whereParams.push(status)
    }

    // 获取举报列表
    const reports = await prisma.$queryRawUnsafe(`
      SELECT 
        r.*,
        u.username as reporterName
      FROM reports r
      LEFT JOIN users u ON r.reporterId = u.id
      ${whereClause}
      ORDER BY r.createdAt DESC
      LIMIT ${limit} OFFSET ${skip}
    `, ...whereParams)

    // 获取总数
    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM reports r ${whereClause}
    `, ...whereParams)
    const total = Number((countResult as any)[0].count)

    // 获取被举报对象的详细信息
    const formattedReports = await Promise.all(
      (reports as any[]).map(async (report) => {
        let targetInfo = null

        try {
          if (report.type === 'tool') {
            const tool = await prisma.$queryRaw`
              SELECT id, name, slug, description FROM tools WHERE id = ${report.targetId}
            `
            targetInfo = (tool as any[])[0] || null
          } else if (report.type === 'share') {
            const share = await prisma.$queryRaw`
              SELECT s.id, s.content, t.name as toolName, u.username as authorName
              FROM shares s
              LEFT JOIN tools t ON s.toolId = t.id
              LEFT JOIN users u ON s.userId = u.id
              WHERE s.id = ${report.targetId}
            `
            targetInfo = (share as any[])[0] || null
          } else if (report.type === 'comment') {
            const comment = await prisma.$queryRaw`
              SELECT c.id, c.content, u.username as authorName
              FROM comments c
              LEFT JOIN users u ON c.userId = u.id
              WHERE c.id = ${report.targetId}
            `
            targetInfo = (comment as any[])[0] || null
          } else if (report.type === 'share_comment') {
            const comment = await prisma.$queryRaw`
              SELECT c.id, c.content, u.username as authorName
              FROM share_comments c
              LEFT JOIN users u ON c.userId = u.id
              WHERE c.id = ${report.targetId}
            `
            targetInfo = (comment as any[])[0] || null
          }
        } catch (e) {
          console.error('获取举报目标信息失败:', e)
        }

        return {
          ...report,
          targetInfo
        }
      })
    )

    return NextResponse.json({
      reports: formattedReports,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('获取举报列表失败:', error)
    return NextResponse.json(
      { error: '获取失败: ' + error.message },
      { status: 500 }
    )
  }
}
