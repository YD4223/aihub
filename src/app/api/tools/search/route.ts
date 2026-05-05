import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// BigInt → Number 序列化修复
function toNum(v: any): number {
  if (typeof v === 'bigint') return Number(v)
  return v
}

// GET /api/tools/search?q=关键词&limit=8
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20)

  if (!q) {
    return NextResponse.json({ tools: [] })
  }

  try {
    const lowerQ = q.toLowerCase()
    // 分词：按空格分割关键词，支持多关键词搜索
    const keywords = lowerQ.split(/\s+/).filter(k => k.length > 0)
    
    // 构建 WHERE 条件：每个关键词都必须在 name/shortDesc/tags 中
    const conditions = keywords.map(k => `
      (
        LOWER(t.name) LIKE '%${k}%'
        OR LOWER(t.shortDesc) LIKE '%${k}%'
        OR LOWER(t.tags) LIKE '%${k}%'
      )
    `).join(' AND ')
    
    // 相关性排序：
    // 1. 名称完全匹配（或开头匹配）权重最高
    // 2. 名称包含关键词次之
    // 3. tags 匹配再次
    // 4. 描述匹配最低
    // 5. 最后按热度(viewCount)排序
    const tools = await prisma.$queryRawUnsafe(`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.shortDesc,
        t.logoUrl,
        c.name as categoryName,
        t.viewCount,
        -- 相关性得分：名称匹配得分最高
        (
          CASE WHEN LOWER(t.name) = '${lowerQ}' THEN 100
               WHEN LOWER(t.name) LIKE '${lowerQ}%' THEN 80
               WHEN LOWER(t.name) LIKE '%${lowerQ}%' THEN 60
               ELSE 0
          END
          +
          CASE WHEN LOWER(t.tags) LIKE '%${lowerQ}%' THEN 40 ELSE 0 END
          +
          CASE WHEN LOWER(t.shortDesc) LIKE '%${lowerQ}%' THEN 20 ELSE 0 END
        ) as relevanceScore
      FROM tools t
      LEFT JOIN categories c ON t.categoryId = c.id
      WHERE t.status = 'approved'
        AND (${conditions})
      ORDER BY
        relevanceScore DESC,
        t.viewCount DESC
      LIMIT ${limit}
    `)

    const formatted = (tools as any[]).map(t => ({
      id: toNum(t.id),
      name: t.name,
      slug: t.slug,
      shortDesc: t.shortDesc,
      logoUrl: t.logoUrl,
      categoryName: t.categoryName,
      viewCount: toNum(t.viewCount)
    }))

    return NextResponse.json({ tools: formatted })
  } catch (error: any) {
    console.error('工具搜索失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
