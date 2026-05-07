import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tools/stats?toolId=xxx - 获取工具实时统计数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const toolId = searchParams.get('toolId')
    if (!toolId) return NextResponse.json({ error: '需要toolId' }, { status: 400 })

    const [viewResult, likeResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<any>>(
        `SELECT "viewCount" FROM tools WHERE id = $1`,
        parseInt(toolId)
      ),
      prisma.$queryRawUnsafe<Array<any>>(
        `SELECT COUNT(*) as total FROM user_like_tools WHERE tool_id = $1`,
        parseInt(toolId)
      )
    ])

    return NextResponse.json({
      viewCount: Number(viewResult[0]?.viewCount || 0),
      likeCount: Number(likeResult[0]?.total || 0)
    })
  } catch (error: any) {
    console.error('[Stats] 错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
