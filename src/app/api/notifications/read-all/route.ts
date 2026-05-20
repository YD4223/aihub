import { NextRequest, NextResponse } from 'next/server'
import { markAllAsRead } from '@/lib/notification'

// POST /api/notifications/read-all - 全部标记已读
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
    }

    await markAllAsRead(userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('全部标记已读失败:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
