import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/friend-links - 获取所有友情链接
export async function GET() {
  try {
    const links = await prisma.friendLink.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ links })
  } catch (error: any) {
    console.error('[Admin FriendLinks] GET错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/friend-links - 新增友情链接
export async function POST(request: NextRequest) {
  try {
    const { name, url, description, sortOrder } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: '链接名称不能为空' }, { status: 400 })
    }
    if (!url?.trim()) {
      return NextResponse.json({ error: '链接地址不能为空' }, { status: 400 })
    }
    const link = await prisma.friendLink.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        description: description?.trim() || null,
        sortOrder: sortOrder || 0,
      },
    })
    return NextResponse.json({ link })
  } catch (error: any) {
    console.error('[Admin FriendLinks] POST错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
