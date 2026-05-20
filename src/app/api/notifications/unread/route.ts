import { NextRequest, NextResponse } from 'next/server'
import { getUnreadCount } from '@/lib/notification'

// GET /api/notifications/unread?userId=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = parseInt(searchParams.get('userId') || '0')

  if (!userId) {
    return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
  }

  try {
    const count = await getUnreadCount(userId)
    return NextResponse.json({ count })
  } catch (error: any) {
    console.error('获取未读数失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
