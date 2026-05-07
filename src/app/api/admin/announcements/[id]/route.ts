import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/announcements/[id] - 更新公告
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const { text, type, enabled, sortOrder } = await request.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: '公告内容不能为空' }, { status: 400 })
    }
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        text: text.trim(),
        ...(type !== undefined && { type }),
        ...(enabled !== undefined && { enabled }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })
    return NextResponse.json({ announcement })
  } catch (error: any) {
    console.error('[Admin Announcements] PUT错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/announcements/[id] - 删除公告
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    await prisma.announcement.delete({ where: { id } })
    return NextResponse.json({ message: '已删除' })
  } catch (error: any) {
    console.error('[Admin Announcements] DELETE错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
