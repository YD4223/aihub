import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 记录浏览（防刷量：同一用户/IP 24小时内只计一次）
export async function POST(request: NextRequest) {
  try {
    const { targetType, targetId } = await request.json()

    if (!targetType || !targetId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 获取用户ID（如果已登录）
    const userStr = request.headers.get('x-user-data')
    const userId = userStr ? JSON.parse(userStr).id : null

    // 获取IP地址
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'

    // 检查24小时内是否已记录过浏览
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const existingView = await prisma.viewRecord.findFirst({
      where: {
        targetType,
        targetId: parseInt(targetId),
        viewedAt: {
          gte: twentyFourHoursAgo
        },
        OR: [
          { userId: userId || undefined },
          { ipAddress: ipAddress as string }
        ]
      }
    })

    // 如果24小时内已浏览过，直接返回成功但不增加计数
    if (existingView) {
      return NextResponse.json({ 
        success: true, 
        message: '已记录浏览',
        isNew: false 
      })
    }

    // 创建浏览记录
    await prisma.viewRecord.create({
      data: {
        userId,
        ipAddress: ipAddress as string,
        targetType,
        targetId: parseInt(targetId)
      }
    })

    // 增加对应表的浏览量
    if (targetType === 'share') {
      await prisma.$executeRaw`
        UPDATE shares SET "viewCount" = "viewCount" + 1 WHERE id = ${parseInt(targetId)}
      `
    } else if (targetType === 'tool') {
      await prisma.$executeRaw`
        UPDATE tools SET "viewCount" = "viewCount" + 1 WHERE id = ${parseInt(targetId)}
      `
    } else if (targetType === 'news') {
      await prisma.$executeRaw`
        UPDATE news SET "viewCount" = "viewCount" + 1 WHERE id = ${parseInt(targetId)}
      `
    }

    return NextResponse.json({ 
      success: true, 
      message: '浏览记录成功',
      isNew: true 
    })

  } catch (error) {
    console.error('记录浏览失败:', error)
    return NextResponse.json({ error: '记录浏览失败' }, { status: 500 })
  }
}
