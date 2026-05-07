import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/shares/stats - 获取分享统计数据
export async function GET(request: NextRequest) {
  try {
    const [toolCount, lifeCount, totalLikes, totalComments] = await Promise.all([
      prisma.share.count({ where: { type: 'tool', status: 'approved' } }),
      prisma.share.count({ where: { type: 'life', status: 'approved' } }),
      prisma.share.aggregate({ _sum: { likes: true }, where: { status: 'approved' } }),
      prisma.shareComment.count({ where: { status: 'approved' } })
    ])

    return NextResponse.json({
      toolCount,
      lifeCount,
      totalLikes: totalLikes._sum.likes || 0,
      totalComments
    })
  } catch (error) {
    console.error('获取分享统计失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
