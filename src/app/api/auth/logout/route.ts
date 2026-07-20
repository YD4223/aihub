import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  
  // 清除 httpOnly 的 auth_token cookie
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,     // 立即过期
    path: '/',
  })
  
  return res
}
