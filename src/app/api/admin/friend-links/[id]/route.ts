import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/friend-links/[id] - 更新友情链接
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const { name, url, description, sortOrder, enabled } = await request.json()
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: '链接名称不能为空' }, { status: 400 })
    }
    if (url !== undefined && !url?.trim()) {
      return NextResponse.json({ error: '链接地址不能为空' }, { status: 400 })
    }
    const link = await prisma.friendLink.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(url !== undefined && { url: url.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(enabled !== undefined && { enabled }),
      },
    })
    return NextResponse.json({ link })
  } catch (error: any) {
    console.error('[Admin FriendLinks] PUT错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/friend-links/[id] - 删除友情链接
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    await prisma.friendLink.delete({ where: { id } })
    return NextResponse.json({ message: '已删除' })
  } catch (error: any) {
    console.error('[Admin FriendLinks] DELETE错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
