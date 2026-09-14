import { NextRequest, NextResponse } from 'next/server'
import { deleteNotification } from '@/lib/notification'
import { requireUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 会话归属校验：只能删除自己的通知
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { notificationId, userId } = await request.json()
    if (!notificationId || !userId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }
    if (auth.userId !== parseInt(userId)) {
      return NextResponse.json({ error: '无权操作该通知' }, { status: 403 })
    }
    await deleteNotification(notificationId, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除通知失败:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
