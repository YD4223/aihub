import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/tools?status=&page=&limit=&search=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'suspended' | null
  const source = searchParams.get('source') as 'crawler' | 'user' | null
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const skip = (page - 1) * limit

  try {
    // 使用原始 SQL 查询（绕过 Prisma Client 缓存问题）
    // 显示所有工具，包括爬虫抓取的和用户提交的
    let whereClause = 'WHERE 1=1'
    if (status) {
      whereClause += ` AND status = '${status}'`
    }
    if (source) {
      whereClause += ` AND source = '${source}'`
    }
    if (search) {
      whereClause += ` AND (name ILIKE '%${search}%' OR "shortDesc" ILIKE '%${search}%' OR description ILIKE '%${search}%' OR tags ILIKE '%${search}%')`
    }

    // 获取工具列表
    const tools = await prisma.$queryRawUnsafe(`
      SELECT t.*, c.name as "categoryName"
      FROM tools t
      LEFT JOIN categories c ON t."categoryId" = c.id
      ${whereClause}
      ORDER BY t."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `)

    // 获取统计
    const totalResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM tools ${whereClause}`)
    const total = Number((totalResult as any)[0].count)

    const pendingResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM tools WHERE status = 'pending'`)
    const pending = Number((pendingResult as any)[0].count)

    const approvedResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM tools WHERE status = 'approved'`)
    const approved = Number((approvedResult as any)[0].count)

    const rejectedResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM tools WHERE status = 'rejected'`)
    const rejected = Number((rejectedResult as any)[0].count)

    const suspendedResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM tools WHERE status = 'suspended'`)
    const suspended = Number((suspendedResult as any)[0].count)

    return NextResponse.json({
      tools,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: { pending, approved, rejected, suspended, total: pending + approved + rejected + suspended }
    })
  } catch (error: any) {
    console.error('获取工具列表失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
