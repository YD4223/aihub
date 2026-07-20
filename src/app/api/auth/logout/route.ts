import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  // 让数据库中的 sessionToken 失效
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    if (token) {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET "sessionToken" = NULL WHERE "sessionToken" = $1`,
        token
      )
    }
  } catch {}
  
  const res = NextResponse.json({ success: true })
  
  // 清除 httpOnly 的 auth_token cookie
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  
  return res
}
