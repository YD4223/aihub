import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/announcements - 获取所有启用的公告
export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, text: true, type: true },
    })
    return NextResponse.json({ announcements })
  } catch (error: any) {
    console.error('[Announcements] 获取失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
