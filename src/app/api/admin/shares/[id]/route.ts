import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/admin/shares/[id] 删除分享
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shareId = parseInt(params.id)
    
    // 先删除关联评论，再删除分享（避免外键约束报错）
    await prisma.$executeRawUnsafe('DELETE FROM share_comments WHERE "shareId" = $1', shareId)
    await prisma.$executeRawUnsafe('DELETE FROM shares WHERE id = $1', shareId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除分享失败:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
