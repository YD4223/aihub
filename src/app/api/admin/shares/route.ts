import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'
import { isBase64Image, getShareImageUrl } from '@/lib/share-image'

// 允许的状态/类型白名单
const ALLOWED_STATUS = ['pending', 'approved', 'rejected', 'suspended']
const ALLOWED_TYPE = ['tool', 'life']

// GET /api/admin/shares?status=&type=&page=&limit=&search=
export async function GET(request: NextRequest) {
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as string | null
    const type = searchParams.get('type') as string | null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    // 构建参数化 WHERE 子句
    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIdx = 1

    if (status && ALLOWED_STATUS.includes(status)) {
      conditions.push(`s.status = $${paramIdx++}`)
      params.push(status)
    }
    if (type && ALLOWED_TYPE.includes(type)) {
      conditions.push(`s.type = $${paramIdx++}`)
      params.push(type)
    }
    if (search) {
      conditions.push(`(
        s.content LIKE $${paramIdx} OR 
        u.username LIKE $${paramIdx} OR 
        t.name LIKE $${paramIdx}
      )`)
      params.push(`%${search}%`)
      paramIdx++
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    // LIMIT / OFFSET 参数
    params.push(limit)
    const limitIdx = paramIdx++
    params.push(skip)
    const offsetIdx = paramIdx++

    // 并行 2 次 SQL：列表(含总数窗口) + 统计
    const listSQL = `
      SELECT 
        s.id, s.type, s.content, s.images, s.video, s.likes, s.status, 
        s."suspendedReason", 
        to_char(s."suspendedAt", 'YYYY-MM-DD"T"HH24:MI:SS') as "suspendedAt",
        to_char(s."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS') as "createdAt",
        s."userId", s."toolId",
        s."submitToolName", s."submitToolWebsite", s."submitToolDesc",
        s."submitToolCategory", s."submitToolPricing", s."submitToolGithub", s."submitToolLogo",
        u.username as "userUsername", u."avatarUrl" as "userAvatarUrl",
        t.name as "toolName", t.slug as "toolSlug",
        (SELECT COUNT(*) FROM share_comments sc WHERE sc."shareId" = s.id) as "commentsCount",
        COUNT(*) OVER() as "totalCount"
      FROM shares s
      LEFT JOIN users u ON s."userId" = u.id
      LEFT JOIN tools t ON s."toolId" = t.id
      ${whereClause}
      ORDER BY s."createdAt" DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `

    const statsSQL = `
      SELECT 'status' as metric, status as value, COUNT(*) as count FROM shares GROUP BY status
      UNION ALL
      SELECT 'type' as metric, type as value, COUNT(*) as count FROM shares GROUP BY type
    `

    const [shares, statsResult] = await Promise.all([
      prisma.$queryRawUnsafe(listSQL, ...params),
      prisma.$queryRawUnsafe(statsSQL),
    ])

    const sharesArray = shares as any[]
    const total = sharesArray.length > 0 ? Number(sharesArray[0]?.totalCount || 0) : 0

    // 转换数据格式，把 base64 图片替换为 proxy URL
    const formattedShares = (sharesArray).map(share => {
      let images: string[] = []
      try {
        const raw = typeof share.images === 'string' ? JSON.parse(share.images) : share.images
        if (Array.isArray(raw)) {
          images = raw.map((img: string, idx: number) =>
            img && isBase64Image(img) && share.id
              ? getShareImageUrl(share.id, idx)
              : img
          )
        }
      } catch { /* 静默失败 */ }

      return {
        id: share.id,
        type: share.type,
        content: share.content,
        images,
        video: share.video,
        likes: share.likes,
        status: share.status,
        suspendedReason: share.suspendedReason,
        suspendedAt: share.suspendedAt,
        createdAt: share.createdAt,
        userId: share.userId,
        toolId: share.toolId,
        submitToolName: share.submitToolName,
        submitToolWebsite: share.submitToolWebsite,
        submitToolDesc: share.submitToolDesc,
        submitToolCategory: share.submitToolCategory,
        submitToolPricing: share.submitToolPricing,
        submitToolGithub: share.submitToolGithub,
        submitToolLogo: share.submitToolLogo,
        user: share.userId ? {
          id: share.userId,
          username: share.userUsername,
          avatarUrl: share.userAvatarUrl
        } : null,
        tool: share.toolId ? {
          id: share.toolId,
          name: share.toolName,
          slug: share.toolSlug
        } : null,
        _count: {
          comments: Number(share.commentsCount || 0)
        }
      }
    })

    const statsRows = statsResult as Array<{ metric: string; value: string; count: bigint }>
    const pending = Number(statsRows.find(r => r.metric === 'status' && r.value === 'pending')?.count || 0)
    const approved = Number(statsRows.find(r => r.metric === 'status' && r.value === 'approved')?.count || 0)
    const rejected = Number(statsRows.find(r => r.metric === 'status' && r.value === 'rejected')?.count || 0)
    const suspended = Number(statsRows.find(r => r.metric === 'status' && r.value === 'suspended')?.count || 0)
    const toolCount = Number(statsRows.find(r => r.metric === 'type' && r.value === 'tool')?.count || 0)
    const lifeCount = Number(statsRows.find(r => r.metric === 'type' && r.value === 'life')?.count || 0)

    return NextResponse.json({
      shares: formattedShares,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: { pending, approved, rejected, suspended, total: pending + approved + rejected + suspended, tool: toolCount, life: lifeCount }
    })
  } catch (error) {
    console.error('获取分享列表失败:', error)
    return NextResponse.json(
      { error: '获取分享列表失败', shares: [], total: 0, page: 1, totalPages: 1, stats: { pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0, tool: 0, life: 0 } },
      { status: 500 }
    )
  }
}
