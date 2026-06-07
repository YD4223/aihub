import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'

// GET /api/admin/stats  后台数据统计（单次查询，节省数据库连接）
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    // 一次查询拿下所有计数，省 7 次数据库往返
    const result = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT
        (SELECT COUNT(*) FROM tools WHERE status = 'approved') as tools,
        (SELECT COUNT(*) FROM shares WHERE status = 'approved') as shares,
        (SELECT COUNT(*) FROM users WHERE role != 'BANNED') as users,
        (SELECT COUNT(*) FROM tools WHERE status = 'pending') as "pendingTools",
        (SELECT COUNT(*) FROM shares WHERE status = 'pending') as "pendingShares",
        (SELECT COUNT(*) FROM tools WHERE "createdAt"::date >= CURRENT_DATE) as "todayTools",
        (SELECT COUNT(*) FROM shares WHERE "createdAt"::date >= CURRENT_DATE) as "todayShares",
        (SELECT COUNT(*) FROM users WHERE "createdAt"::date >= CURRENT_DATE) as "todayUsers"
    `)

    const row = result[0] || {}

    return NextResponse.json({
      tools: Number(row.tools || 0),
      shares: Number(row.shares || 0),
      users: Number(row.users || 0),
      pendingTools: Number(row.pendingTools || 0),
      pendingShares: Number(row.pendingShares || 0),
      todayNew: Number(row.todayTools || 0) + Number(row.todayShares || 0) + Number(row.todayUsers || 0),
    })
  } catch (error: any) {
    console.error('获取统计失败:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}
