import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notification'

// PATCH /api/reports/[id] - 处理举报
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = parseInt(params.id)
    if (isNaN(reportId)) {
      return NextResponse.json({ error: '无效的举报ID' }, { status: 400 })
    }

    const body = await request.json()
    const { action, resolution, adminId, suspendTarget } = body

    if (!action || !['resolved', 'dismissed'].includes(action)) {
      return NextResponse.json(
        { error: '无效的处理动作，必须是 resolved 或 dismissed' },
        { status: 400 }
      )
    }

    // 获取举报信息
    const report: any = await prisma.$queryRaw`
      SELECT * FROM reports WHERE id = ${reportId}
    `
    
    if (!report || report.length === 0) {
      return NextResponse.json({ error: '举报不存在' }, { status: 404 })
    }

    const reportData = report[0]

    // 如果需要同时下架被举报内容
    if (suspendTarget && action === 'resolved') {
      const targetId = reportData.targetId
      const type = reportData.type
      const suspendReason = resolution || '因举报被下架'

      if (type === 'tool') {
        // 下架工具
        await prisma.$executeRaw`
          UPDATE tools 
          SET status = 'suspended', 
              suspendedReason = ${suspendReason},
              suspendedAt = NOW(),
              updatedAt = NOW()
          WHERE id = ${targetId}
        `
      } else if (type === 'share') {
        // 下架分享
        await prisma.$executeRaw`
          UPDATE shares 
          SET status = 'suspended', 
              suspendedReason = ${suspendReason},
              suspendedAt = NOW(),
              updatedAt = NOW()
          WHERE id = ${targetId}
        `
      } else if (type === 'comment' || type === 'share_comment') {
        // 下架评论
        await prisma.$executeRaw`
          UPDATE comments 
          SET status = 'suspended', 
              suspendedReason = ${suspendReason},
              suspendedAt = NOW(),
              updatedAt = NOW()
          WHERE id = ${targetId}
        `
      }
    }

    // 更新举报状态
    await prisma.$executeRaw`
      UPDATE reports 
      SET 
        status = ${action},
        resolution = ${resolution || null},
        resolvedAt = NOW(),
        resolvedBy = ${adminId || null},
        updatedAt = NOW()
      WHERE id = ${reportId}
    `

    // 通知举报者
    if (reportData.reporterId) {
      const actionLabel = action === 'resolved' ? '已处理' : '已驳回'
      const suspendText = suspendTarget && action === 'resolved' ? '（内容已下架）' : ''
      createNotification({
        userId: reportData.reporterId,
        type: 'system',
        title: `举报${actionLabel}`,
        content: `你举报的内容已被${actionLabel}${suspendText}`,
        link: '/user-center?tab=notifications'
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: action === 'resolved' 
        ? (suspendTarget ? '举报已处理，内容已下架' : '举报已处理') 
        : '举报已驳回'
    })
  } catch (error: any) {
    console.error('处理举报失败:', error)
    return NextResponse.json(
      { error: '处理失败: ' + error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/[id] - 删除举报
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = parseInt(params.id)
    if (isNaN(reportId)) {
      return NextResponse.json({ error: '无效的举报ID' }, { status: 400 })
    }

    await prisma.$executeRaw`DELETE FROM reports WHERE id = ${reportId}`

    return NextResponse.json({
      success: true,
      message: '举报已删除'
    })
  } catch (error: any) {
    console.error('删除举报失败:', error)
    return NextResponse.json(
      { error: '删除失败: ' + error.message },
      { status: 500 }
    )
  }
}
