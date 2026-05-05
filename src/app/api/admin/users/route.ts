import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/users - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const offset = (page - 1) * limit

    // 构建查询条件
    let whereClause = ''
    const conditions: string[] = []
    
    if (search) {
      conditions.push(`(username LIKE '%${search}%' OR email LIKE '%${search}%')`)
    }
    
    if (status !== 'all') {
      conditions.push(`status = '${status}'`)
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ')
    }

    // 获取用户列表
    let users: any[]
    if (whereClause) {
      users = await prisma.$queryRawUnsafe(`
        SELECT 
          id, username, email, "avatarUrl", bio, location, website,
          role, status, "bannedAt", "bannedUntil", "bannedReason", "bannedBy",
          "createdAt", "updatedAt"
        FROM users
        ${whereClause}
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `)
    } else {
      users = await prisma.$queryRaw`
        SELECT 
          id, username, email, "avatarUrl", bio, location, website,
          role, status, "bannedAt", "bannedUntil", "bannedReason", "bannedBy",
          "createdAt", "updatedAt"
        FROM users
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // 获取总数
    let countResult: any[]
    if (whereClause) {
      countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM users ${whereClause}`)
    } else {
      countResult = await prisma.$queryRaw`SELECT COUNT(*) as total FROM users`
    }
    const total = Number((countResult as any[])[0].total)

    // 获取统计
    const statsResult = await prisma.$queryRaw`
      SELECT 
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned,
        COUNT(*) as total
      FROM users
    `
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
