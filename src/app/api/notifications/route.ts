import { NextRequest, NextResponse } from 'next/server'
import { getNotifications } from '@/lib/notification'
import { requireUser } from '@/lib/auth'

// GET /api/notifications?userId=1&page=1&pageSize=20
export async function GET(request: NextRequest) {
  // 会话归属校验：只能读取自己的通知
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const userId = parseInt(searchParams.get('userId') || '0')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  if (!userId) {
    return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
  }

  if (auth.userId !== userId) {
    return NextResponse.json({ error: '无权查看该用户的通知' }, { status: 403 })
  }

  try {
    const result = await getNotifications(userId, page, pageSize)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('获取通知失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
