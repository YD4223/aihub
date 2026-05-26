/**
 * 全局中间件
 * 功能1：API 请求频率限制（60次/分钟）
 * 功能2：安全响应头（兜底保护，next.config.js 的 headers 对所有路由生效）
 */
import { NextRequest, NextResponse } from 'next/server'

// 安全响应头（兜底 - 如果 next.config.js 的 headers() 在某些边缘情况不生效）
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// 内存限流
const requestCounts = new Map<string, { count: number; expiresAt: number }>()

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          ...SECURITY_HEADERS,
        }
      }
    )
  }

  const response = NextResponse.next()
  // 对 API 响应追加安全头（确保即使在 next.config.js 漏掉时也有保护）
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export const config = {
  matcher: '/api/:path*',
}
