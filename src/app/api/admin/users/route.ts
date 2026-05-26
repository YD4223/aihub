import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'

// GET /api/admin/users - 获取用户列表
export async function GET(request: NextRequest) {
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const offset = (page - 1) * limit

    // 参数化构建查询条件
    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIdx = 1

    if (search) {
      conditions.push(`(username LIKE $${paramIdx} OR email LIKE $${paramIdx})`)
      params.push(`%${search}%`)
      paramIdx++
    }

    if (status !== 'all') {
      conditions.push(`status = $${paramIdx++}`)
      params.push(status)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 用户列表查询
    const listSQL = `
      SELECT 
        id, username, email, "avatarUrl", bio, location, website,
        role, status, "bannedAt", "bannedUntil", "bannedReason", "bannedBy",
        "createdAt", "updatedAt"
      FROM users
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `
    params.push(limit, offset)

    const [users, countResult, statsResult] = await Promise.all([
      prisma.$queryRawUnsafe(listSQL, ...params),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        ...params.slice(0, -2) // 排除 LIMIT/OFFSET 参数
      ),
      prisma.$queryRaw`
        SELECT 
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned,
          COUNT(*) as total
        FROM users
      `
    ])

    const total = Number((countResult as any[])[0]?.total || 0)
    const stats = (statsResult as any[])[0]

    return NextResponse.json({
      users: Array.isArray(users) ? users : [],
      total,
      totalPages: Math.ceil(total / limit),
      stats: {
        active: Number(stats.active) || 0,
        banned: Number(stats.banned) || 0,
        total: Number(stats.total) || 0
      }
    })
  } catch (error: any) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
