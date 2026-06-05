import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/leaderboard?type=shares|tools|users|trending&limit=20
// 10分钟缓存（ISR），排行榜不需要实时更新
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'shares'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (type === 'tools') {
      // 热门工具 - 按 viewCount 降序
      const tools = await prisma.$queryRawUnsafe(`
        SELECT t.id, t.name, t.slug, t."viewCount", t.stars, t.upvotes,
          "shortDesc", "logoUrl",
          c.name as "categoryName"
        FROM tools t
        LEFT JOIN categories c ON t."categoryId" = c.id
        WHERE t.status = 'approved' AND t."isActive" = true
        ORDER BY t."viewCount" DESC, t.stars DESC
        LIMIT ${limit}
      `)

      return NextResponse.json({ data: tools, type })
    }

    if (type === 'users') {
      // 活跃用户 - 按已通过的分享数 + 获赞总数列
      const users = await prisma.$queryRawUnsafe(`
        SELECT u.id, u.username, u."avatarUrl", u."createdAt" as "joinDate",
          COUNT(DISTINCT s.id) as "shareCount",
          COALESCE(SUM(s.likes), 0) as "totalLikes",
          (SELECT COUNT(*) FROM share_comments sc WHERE sc."userId" = u.id AND sc.status = 'approved') as "commentCount"
        FROM users u
        LEFT JOIN shares s ON s."userId" = u.id AND s.status = 'approved'
        WHERE u.role != 'BANNED'
        GROUP BY u.id
        HAVING COUNT(DISTINCT s.id) > 0
        ORDER BY "shareCount" DESC, "totalLikes" DESC
        LIMIT ${limit}
      `)

      return NextResponse.json({ data: users, type })
    }

    if (type === 'trending') {
      // 趋势上升 - 7天内热度最高的工具
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dateStr = sevenDaysAgo.toISOString().split('T')[0]

      const trending = await prisma.$queryRawUnsafe(`
        SELECT t.id, t.name, t.slug, t."viewCount", t.stars, t.upvotes,
          t."shortDesc", t."logoUrl",
          COALESCE(h7."viewCount", 0) as "weekViews",
          COALESCE(h1."viewCount", 0) as "todayViews",
          c.name as "categoryName"
        FROM tools t
        LEFT JOIN categories c ON t."categoryId" = c.id
        LEFT JOIN LATERAL (
          SELECT "viewCount" FROM tool_trend_histories
          WHERE "toolId" = t.id AND date >= $1
          ORDER BY date DESC LIMIT 1
        ) h7 ON true
        LEFT JOIN LATERAL (
          SELECT "viewCount" FROM tool_trend_histories
          WHERE "toolId" = t.id AND date = CURRENT_DATE
          ORDER BY date DESC LIMIT 1
        ) h1 ON true
        WHERE t.status = 'approved' AND t."isActive" = true
        ORDER BY t."viewCount" DESC
        LIMIT ${limit}
      `, dateStr)

      return NextResponse.json({ data: trending, type })
    }

    // 默认：热门分享 - 按 likes 降序
    const shares = await prisma.$queryRawUnsafe(`
      SELECT s.id, s.content, s.likes, s.type, s."createdAt",
        s."viewCount",
        u.id as "userId", u.username as "userName", u."avatarUrl" as "userAvatarUrl",
        t.name as "toolName", t.slug as "toolSlug", t."shortDesc" as "toolShortDesc",
        (SELECT COUNT(*) FROM share_comments sc WHERE sc."shareId" = s.id AND (sc.status IS NULL OR sc.status = 'approved')) as "commentsCount"
      FROM shares s
      LEFT JOIN users u ON s."userId" = u.id
      LEFT JOIN tools t ON s."toolId" = t.id
      WHERE s.status = 'approved'
      ORDER BY s.likes DESC, s."createdAt" DESC
      LIMIT ${limit}
    `)

    // 格式化数据
    const formattedShares = (shares as any[]).map((s: any) => ({
      id: s.id,
      content: s.content,
      likes: Number(s.likes),
      viewCount: Number(s.viewCount || 0),
      type: s.type,
      createdAt: s.createdAt,
      commentsCount: Number(s.commentsCount || 0),
      user: {
        id: s.userId,
        username: s.userName,
        avatarUrl: s.userAvatarUrl
      },
      tool: s.toolName ? {
        name: s.toolName,
        slug: s.toolSlug,
        shortDesc: s.toolShortDesc
      } : null
    }))

    return NextResponse.json({ data: formattedShares, type })
  } catch (error: any) {
    console.error('获取排行榜失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
