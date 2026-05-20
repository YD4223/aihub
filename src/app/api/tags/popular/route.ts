import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tags/popular?limit=10
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    const tags = await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
      SELECT 
        TRIM(unnest(string_to_array(s.tags, ','))) as tag,
        COUNT(*) as count
      FROM shares s
      WHERE s.tags IS NOT NULL AND s.tags != '' AND s.status = 'approved'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT ${limit}
    `

    return NextResponse.json({
      tags: tags.map(t => ({
        name: t.tag,
        count: Number(t.count),
      })),
    })
  } catch (error: any) {
    console.error('获取热门标签失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
