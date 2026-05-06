import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/tools?userId=xxx - 获取指定用户提交的工具列表（从 shares 表查）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const skip = (page - 1) * limit

  if (!userId) {
    return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
  }

  try {
    // 获取用户提交的 share 记录（type='tool' 的提交）
    const shares = await prisma.$queryRawUnsafe(`
      SELECT 
        id, content, images, status, "createdAt",
        "submitToolName" as name,
        "submitToolWebsite" as website_url,
        "submitToolDesc" as short_desc,
        "submitToolCategory" as category_name,
        "submitToolPricing" as pricing_type,
        "submitToolGithub" as github_url,
        "submitToolLogo" as logo_url
      FROM shares
      WHERE "userId" = ${parseInt(userId)} AND type = 'tool'
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `)

    // 格式化数据
    const formattedTools = (shares as any[]).map(t => ({
      id: Number(t.id),
      name: t.name || '未命名工具',
      slug: 'share-' + t.id,
      shortDesc: t.short_desc || null,
      description: t.content || null,
      websiteUrl: t.website_url || null,
      logoUrl: t.logo_url || null,
      status: t.status || 'pending',
      createdAt: t.createdAt,
      category: t.category_name ? { name: t.category_name, slug: '' } : null,
      _count: { comments: 0, shares: 0 }
    }))

    // 获取总数
    const totalResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM shares WHERE "userId" = ${parseInt(userId)} AND type = 'tool'
    `)
    const total = Number((totalResult as any)[0].count)

    return NextResponse.json({
      tools: formattedTools,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('获取用户工具失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
