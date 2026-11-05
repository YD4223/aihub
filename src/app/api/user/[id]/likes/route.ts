import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/[id]/likes?tab=received - 获取用户获赞详情
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 获取该用户所有已通过分享（按获赞数降序）
    const shares = await prisma.$queryRawUnsafe(`
      SELECT 
        s.id,
        s.content,
        s.images,
        s.likes as likeCount,
        s.status,
        s."createdAt",
        t.name as "toolName",
        t.slug as "toolSlug",
        (SELECT COUNT(*) FROM comments WHERE "shareId" = s.id AND status = 'approved') as "commentsCount"
      FROM shares s
      LEFT JOIN tools t ON s."toolId" = t.id
      WHERE s."userId" = ${userId} AND s.status = 'approved' AND s.likes > 0
      ORDER BY s.likes DESC, s."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `)

    const formattedShares = Array.isArray(shares) ? shares.map((s: any) => ({
      id: Number(s.id),
      content: s.content?.length > 100 ? s.content.slice(0, 100) + '...' : s.content,
      images: s.images ? (() => { try { return JSON.parse(s.images); } catch { return null; }})() : null,
      likeCount: Number(s.likeCount || 0),
      createdAt: s.createdAt,
      tool: s.toolName ? {
        name: s.toolName,
        slug: s.toolSlug,
      } : null,
      commentCount: Number(s.commentsCount || 0),
    })) : []

    // 总计
    const totalResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM shares 
      WHERE "userId" = ${userId} AND status = 'approved' AND likes > 0
    `)
    const total = Number((totalResult as any[])[0]?.count || 0)

    return NextResponse.json({
      likes: formattedShares,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    console.error('获取获赞详情失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
