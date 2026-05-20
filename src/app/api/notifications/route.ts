import { NextRequest, NextResponse } from 'next/server'
import { getNotifications } from '@/lib/notification'

// GET /api/notifications?userId=1&page=1&pageSize=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = parseInt(searchParams.get('userId') || '0')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  if (!userId) {
    return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
  }

  try {
    const result = await getNotifications(userId, page, pageSize)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('获取通知失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
