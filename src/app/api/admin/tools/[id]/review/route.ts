import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/admin/tools/[id]/review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const toolId = parseInt(params.id)
    const body = await request.json()
    const { action, note, adminId } = body // action: 'approve' | 'reject' | 'suspend' | 'restore'

    if (!action || !['approve', 'reject', 'suspend', 'restore'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 })
    }

    let status: string = ''
    let isActive: boolean = false

    switch (action) {
      case 'approve':
        status = 'approved'
        isActive = true
        break
      case 'reject':
        status = 'rejected'
        isActive = false
        break
      case 'suspend':
        status = 'suspended'
        isActive = false
        break
      case 'restore':
        status = 'approved'
        isActive = true
        break
    }

    const reviewNote = note || null
    const suspendedReason = action === 'suspend' ? note : null
    const suspendedBy = action === 'suspend' ? adminId : null

    // PostgreSQL 驼峰列名必须加双引号，否则自动转小写
    if (action === 'suspend') {
      await prisma.$executeRaw`
        UPDATE tools 
        SET status = ${status}, 
            "isActive" = ${isActive}, 
            "suspendedAt" = NOW(), 
            "suspendedReason" = ${suspendedReason},
            "suspendedBy" = ${suspendedBy}
        WHERE id = ${toolId}
      `
    } else if (action === 'restore') {
      await prisma.$executeRaw`
        UPDATE tools 
        SET status = ${status}, 
            "isActive" = ${isActive}, 
            "suspendedAt" = NULL, 
            "suspendedReason" = NULL,
            "suspendedBy" = NULL
        WHERE id = ${toolId}
      `
    } else {
      await prisma.$executeRaw`
        UPDATE tools 
        SET status = ${status}, 
            "isActive" = ${isActive}, 
            "reviewedAt" = NOW(), 
            "reviewNote" = ${reviewNote}
        WHERE id = ${toolId}
      `
    }

    // 查询更新后的工具
    const toolResult = await prisma.$queryRaw`
      SELECT * FROM tools WHERE id = ${toolId}
    `
    const tool = (toolResult as any[])[0]

    return NextResponse.json({ tool })
  } catch (error: any) {
    console.error('审核工具失败:', error)
    return NextResponse.json({ error: '审核失败: ' + error.message }, { status: 500 })
  }
}
