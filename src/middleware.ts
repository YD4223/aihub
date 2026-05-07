/**
 * 全局中间件
 * 功能：API请求频率限制（60次/分钟），防止爬虫刷API
 * 不影响正常用户使用
 */
import { NextRequest, NextResponse } from 'next/server'

// 内存限流（Vercel Edge Runtime 中每个 Edge Node 独立）
const requestCounts = new Map<string, { count: number; expiresAt: number }>()

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1'

  const now = Date.now()
  const windowMs = 60_000
  const maxRequests = 60

  const record = requestCounts.get(ip)

  // 过期或首次请求
  if (!record || record.expiresAt < now) {
    requestCounts.set(ip, { count: 1, expiresAt: now + windowMs })
    return NextResponse.next()
  }

  record.count++

  if (record.count > maxRequests) {
    return new NextResponse(
      JSON.stringify({ error: '请求过于频繁，请稍后再试' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
