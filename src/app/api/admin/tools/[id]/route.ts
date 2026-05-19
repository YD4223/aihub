import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/admin/tools/[id] — 彻底删除工具（含关联数据）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const toolId = parseInt(params.id)

    // 先检查工具是否存在
    const existing = await prisma.$queryRawUnsafe(
      'SELECT id, name FROM tools WHERE id = $1',
      toolId
    )
    if (!(existing as any[]).length) {
      return NextResponse.json({ error: '工具不存在' }, { status: 404 })
    }

    // 按顺序删除关联数据（忽略不存在的表）
    const deleteTasks = [
      `DELETE FROM share_comments WHERE "toolId" = $1`,
      `DELETE FROM shares WHERE "toolId" = $1`,
      `DELETE FROM comments WHERE "toolId" = $1`,
      `DELETE FROM "ToolTrendHistory" WHERE "toolId" = $1`,
      `DELETE FROM view_records WHERE "targetId" = $1 AND "targetType" = 'tool'`,
      `DELETE FROM user_favorite_tools WHERE "toolId" = $1`,
      `DELETE FROM user_like_tools WHERE "toolId" = $1`,
      `DELETE FROM ai_interactions WHERE "toolId" = $1`,
    ]

    for (const sql of deleteTasks) {
      try {
        await prisma.$executeRawUnsafe(sql, toolId)
      } catch {
        // 表不存在跳过
      }
    }

    // 最后删除工具本身
    await prisma.$executeRawUnsafe('DELETE FROM tools WHERE id = $1', toolId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除工具失败:', error)
    return NextResponse.json({ error: '删除失败: ' + error.message }, { status: 500 })
  }
}
