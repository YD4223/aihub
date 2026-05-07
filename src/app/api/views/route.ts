import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 记录浏览（防刷量：同一用户/IP 24小时内只计一次）
export async function POST(request: NextRequest) {
  try {
    const { targetType, targetId } = await request.json()

    if (!targetType || !targetId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 获取IP地址
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'

    // 检查24小时内是否已记录过浏览（用 raw SQL 避免 Prisma 列名映射问题）
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const existing = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id FROM view_records 
       WHERE "targetType" = $1 AND "targetId" = $2 
       AND "viewedAt" >= $3::timestamptz
       AND "ipAddress" = $4
       LIMIT 1`,
      targetType, parseInt(targetId), twentyFourHoursAgo.toISOString(), ipAddress
    )

    // 如果24小时内已浏览过，直接返回成功但不增加计数
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: '已记录浏览',
        isNew: false 
      })
    }

    // 创建浏览记录
    await prisma.$executeRawUnsafe(
      `INSERT INTO view_records ("targetType", "targetId", "viewedAt") VALUES ($1, $2, NOW())`,
      targetType, parseInt(targetId)
    )

    // 增加对应表的浏览量
    if (targetType === 'share') {
      await prisma.$executeRawUnsafe(`UPDATE shares SET "viewCount" = "viewCount" + 1 WHERE id = $1`, parseInt(targetId))
    } else if (targetType === 'tool') {
      await prisma.$executeRawUnsafe(`UPDATE tools SET "viewCount" = "viewCount" + 1 WHERE id = $1`, parseInt(targetId))
    } else if (targetType === 'news') {
      await prisma.$executeRawUnsafe(`UPDATE news SET "viewCount" = "viewCount" + 1 WHERE id = $1`, parseInt(targetId))
    }

    return NextResponse.json({ 
      success: true, 
      message: '浏览记录成功',
      isNew: true 
    })

  } catch (error: any) {
    console.error('记录浏览失败:', error)
    return NextResponse.json({ error: '记录浏览失败: ' + (error.message || '') }, { status: 500 })
  }
}
