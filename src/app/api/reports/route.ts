import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/reports - 提交举报
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, targetId, reason, description, reporterId } = body

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
          AND reporterId = ${parseInt(reporterId)}
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
        ${reporterId || null}, 
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

// GET /api/reports - 获取举报列表（管理后台）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 构建查询条件
    let whereClause = `WHERE r.status = ${status === 'all' ? "r.status" : `'${status}'`}`
    if (status === 'all') {
      whereClause = ''
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
    `)

    // 获取总数
    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM reports r ${whereClause}
    `)
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
