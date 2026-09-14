import { NextRequest, NextResponse } from 'next/server'
import { markAsRead } from '@/lib/notification'
import { requireUser } from '@/lib/auth'

// POST /api/notifications/read - 标记单条通知为已读
export async function POST(request: NextRequest) {
  try {
    // 会话归属校验：只能操作自己的通知
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { notificationId, userId } = body

    if (!notificationId || !userId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    if (auth.userId !== parseInt(userId)) {
      return NextResponse.json({ error: '无权操作该通知' }, { status: 403 })
    }

    await markAsRead(notificationId, userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('标记已读失败:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
