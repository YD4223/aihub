import { NextRequest, NextResponse } from 'next/server'
import { markAsRead } from '@/lib/notification'

// POST /api/notifications/read - 标记单条通知为已读
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, userId } = body

    if (!notificationId || !userId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    await markAsRead(notificationId, userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('标记已读失败:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
