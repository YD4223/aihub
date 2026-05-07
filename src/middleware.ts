/**
 * 全局中间件
 * 功能1：搜索页拦截 — 未登录不能搜索
 * 功能2：API 请求频率限制（60次/分钟）
 */
import { NextRequest, NextResponse } from 'next/server'

// 内存限流
const requestCounts = new Map<string, { count: number; expiresAt: number }>()

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // === 搜索拦截：未登录不能使用搜索功能 ===
  if (pathname === '/tools' && request.nextUrl.searchParams.has('search')) {
    const authToken = request.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.redirect(new URL('/login?redirect=/tools', request.url))
    }
  }

  // === API 请求限流 ===
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1'

  const now = Date.now()
  const windowMs = 60_000
  const maxRequests = 60

  const record = requestCounts.get(ip)

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
  matcher: ['/api/:path*', '/tools'],
}
