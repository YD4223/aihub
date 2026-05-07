import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/announcements - 获取所有公告（含禁用）
export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ announcements })
  } catch (error: any) {
    console.error('[Admin Announcements] GET错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/announcements - 新增公告
export async function POST(request: NextRequest) {
  try {
    const { text, type, enabled, sortOrder } = await request.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: '公告内容不能为空' }, { status: 400 })
    }
    const announcement = await prisma.announcement.create({
      data: {
        text: text.trim(),
        type: type || 'info',
        enabled: enabled ?? true,
        sortOrder: sortOrder || 0,
      },
    })
    return NextResponse.json({ announcement })
  } catch (error: any) {
    console.error('[Admin Announcements] POST错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
