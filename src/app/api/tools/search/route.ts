import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/tools/search?q=关键词&limit=8&userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20)
  const userId = searchParams.get('userId')

  // 必须登录才能搜索
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再使用搜索功能' }, { status: 401 })
  }

  if (!q) {
    return NextResponse.json({ tools: [] })
  }

  try {
    const lowerQ = q.toLowerCase()
    const keywords = lowerQ.split(/\s+/).filter(k => k.length > 0)

    // 用 Prisma findMany 替代 raw SQL
    const allTools = await prisma.tool.findMany({
      where: { status: 'approved' },
      include: { category: { select: { name: true } } },
      take: 100,
    })

    // 内存中筛选和排序
    const filtered = allTools
      .filter(t => {
        const name = (t.name || '').toLowerCase()
        const desc = (t.shortDesc || '').toLowerCase()
        const tags = (t.tags || '').toLowerCase()
        return keywords.every(k =>
          name.includes(k) || desc.includes(k) || tags.includes(k)
        )
      })
      .map(t => {
        const name = (t.name || '').toLowerCase()
        const tags = (t.tags || '').toLowerCase()
        const desc = (t.shortDesc || '').toLowerCase()
        let score = 0
        if (name === lowerQ) score += 100
        else if (name.startsWith(lowerQ)) score += 80
        else if (name.includes(lowerQ)) score += 60
        if (tags.includes(lowerQ)) score += 40
        if (desc.includes(lowerQ)) score += 20
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          shortDesc: t.shortDesc,
          logoUrl: t.logoUrl,
          categoryName: t.category?.name || null,
          viewCount: t.viewCount,
          score,
        }
      })
      .sort((a, b) => b.score - a.score || b.viewCount - a.viewCount)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest)

    return NextResponse.json({ tools: filtered })
  } catch (error: any) {
    console.error('工具搜索失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
