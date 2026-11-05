import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import crypto from 'crypto'

// POST /api/auth/refresh-token - 刷新当前会话的 sessionToken
// 安全：必须已有有效会话，且只能刷新自己的 token。
// （旧实现仅凭 body.userId 就返回该用户的 sessionToken → 任何人可接管任意账号）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({} as any))
    if (body?.userId && parseInt(body.userId) !== auth.userId) {
      return NextResponse.json({ error: '无权刷新他人会话' }, { status: 403 })
    }

    const userId = auth.userId

    const result = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT "sessionToken" FROM users WHERE id = $1`,
      userId
    )

    // 已有 token：只续期 cookie，不把 token 回传给前端（保持 httpOnly 的防护意义）
    if (Array.isArray(result) && result.length > 0 && result[0].sessionToken) {
      const res = NextResponse.json({ success: true, userId })
      res.cookies.set('auth_token', result[0].sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      return res
    }

    // 没有 token 才生成新的
    const sessionToken = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "sessionToken" = $1 WHERE id = $2`,
      sessionToken, userId
    )

    const res = NextResponse.json({ success: true, userId })
    res.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (error: any) {
    console.error('[RefreshToken] 错误:', error)
    return NextResponse.json({ error: '刷新会话失败' }, { status: 500 })
  }
}
