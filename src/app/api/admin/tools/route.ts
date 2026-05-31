import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'

// 允许的 status/source 白名单（防止 SQL 注入枚举）
const ALLOWED_STATUS = ['pending', 'approved', 'rejected', 'suspended']
const ALLOWED_SOURCE = ['crawler', 'user']

// GET /api/admin/tools?status=&source=&page=&limit=&search=
export async function GET(request: NextRequest) {
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as string | null
  const source = searchParams.get('source') as string | null
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const search = searchParams.get('search') || ''
  const timeFilter = searchParams.get('time') as string | null  // '24h' | '7d' | null
  const skip = (page - 1) * limit

  try {
    // 构建参数化 WHERE 子句 + 参数数组
    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIdx = 1

    // status 白名单校验
    if (status && ALLOWED_STATUS.includes(status)) {
      conditions.push(`t.status = $${paramIdx++}`)
      params.push(status)
    }
    // source 白名单校验
    if (source && ALLOWED_SOURCE.includes(source)) {
      conditions.push(`t.source = $${paramIdx++}`)
      params.push(source)
    }
    // 时间筛选
    if (timeFilter === '24h') {
      conditions.push(`t."createdAt" >= NOW() - INTERVAL '24 hours'`)
    } else if (timeFilter === '7d') {
      conditions.push(`t."createdAt" >= NOW() - INTERVAL '7 days'`)
    }

    const hasSearch = !!search
    if (search) {
      conditions.push(`(
        LOWER(t.name) LIKE LOWER($${paramIdx}) OR
        LOWER(t."shortDesc") LIKE LOWER($${paramIdx}) OR
        LOWER(t.description) LIKE LOWER($${paramIdx}) OR
        LOWER(t.tags) LIKE LOWER($${paramIdx})
      )`)
      params.push(`%${search}%`)
      paramIdx++
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : ''

    // 搜索时加入相关性排序
    const orderClause = hasSearch && search
      ? `ORDER BY
          (CASE WHEN LOWER(t.name) = LOWER($${paramIdx}) THEN 100 ELSE 0 END +
           CASE WHEN LOWER(t.name) LIKE LOWER($${paramIdx} || '%') THEN 50 ELSE 0 END +
           CASE WHEN LOWER(t.name) LIKE LOWER('%' || $${paramIdx} || '%') THEN 30 ELSE 0 END +
           CASE WHEN LOWER(t.tags) LIKE LOWER('%' || $${paramIdx} || '%') THEN 20 ELSE 0 END +
           CASE WHEN LOWER(t."shortDesc") LIKE LOWER('%' || $${paramIdx} || '%') THEN 15 ELSE 0 END +
           CASE WHEN LOWER(t.description) LIKE LOWER('%' || $${paramIdx} || '%') THEN 5 ELSE 0 END) DESC,
           t."createdAt" DESC`
      : 'ORDER BY t."createdAt" DESC'

    // 相关性排序的搜索词参数
    if (hasSearch && search) {
      params.push(search)
      paramIdx++
    }

    // LIMIT 和 OFFSET 参数
    params.push(limit)
    const limitParamIdx = paramIdx++
    params.push(skip)
    const offsetParamIdx = paramIdx++

    // 构建主查询 SQL（纯文本，所有变量用 $N 代替）
    let listSQL = `
      SELECT t.*, c.name as "categoryName", COUNT(*) OVER() as "totalCount"
      FROM tools t
      LEFT JOIN categories c ON t."categoryId" = c.id
      ${whereClause}
      ${orderClause}
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `

    // 并行 2 次 SQL：列表(含总数窗口) + 状态统计
    const [tools, statsResult] = await Promise.all([
      prisma.$queryRawUnsafe(listSQL, ...params),
      prisma.$queryRawUnsafe(`SELECT status, COUNT(*) as count FROM tools GROUP BY status`),
    ]) as [any[], any[]]

    const toolsArray = tools as any[]
    const total = toolsArray.length > 0 ? Number(toolsArray[0]?.totalCount || 0) : 0

    // 递归转换 BigInt 为 Number，防止 JSON.stringify 报错
    const sanitizeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return Number(obj)
      if (Array.isArray(obj)) return obj.map(sanitizeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = sanitizeBigInt(value)
        }
        return result
      }
      return obj
    }

    const pending = Number((statsResult as any[]).find(r => r.status === 'pending')?.count || 0)
    const approved = Number((statsResult as any[]).find(r => r.status === 'approved')?.count || 0)
    const rejected = Number((statsResult as any[]).find(r => r.status === 'rejected')?.count || 0)
    const suspended = Number((statsResult as any[]).find(r => r.status === 'suspended')?.count || 0)

    return NextResponse.json({
      tools: sanitizeBigInt(toolsArray),
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
