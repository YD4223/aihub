import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// 登录频率限制：每 IP 最多连续失败 5 次，锁定 5 分钟
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 5

function getRateLimitInfo(ip: string): { allowed: boolean; remaining: number; lockedUntil: number | null } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  
  if (entry && entry.lockedUntil > now) {
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil }
  }
  
  if (entry && entry.lockedUntil <= now) {
    loginAttempts.delete(ip)
    return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null }
  }
  
  return { allowed: true, remaining: MAX_ATTEMPTS - (entry?.count || 0), lockedUntil: null }
}

function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000
  }
  loginAttempts.set(ip, entry)
}

function resetAttempts(ip: string) {
  loginAttempts.delete(ip)
}

export async function POST(request: NextRequest) {
  try {
    // 速率限制检查
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1'
    const { allowed, remaining, lockedUntil } = getRateLimitInfo(ip)
    
    if (!allowed) {
      const waitSeconds = Math.ceil((lockedUntil! - Date.now()) / 1000)
      return NextResponse.json(
        { error: `登录尝试过于频繁，请 ${waitSeconds} 秒后再试` },
        { status: 429 }
      )
    }
    
    const { email, username, password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: '密码不能为空' },
        { status: 400 }
      )
    }

    if (!email && !username) {
      return NextResponse.json(
        { error: '请输入邮箱或用户名' },
        { status: 400 }
      )
    }

    // 查找用户（支持邮箱或用户名）
    let user = null
    if (email) {
      user = await prisma.user.findUnique({ where: { email } })
    }
    if (!user && username) {
      user = await prisma.user.findUnique({ where: { username } })
    }

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 验证密码（支持明文和bcrypt）
    let isValid = false
    let needsUpgrade = false
    if (user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password)
    } else {
      // 明文密码兼容（老用户），验证后升级为bcrypt
      isValid = user.password === password
      if (isValid) needsUpgrade = true
    }

    if (!isValid) {
      recordFailedAttempt(ip)
      const remaining = MAX_ATTEMPTS - (loginAttempts.get(ip)?.count || 0)
      return NextResponse.json(
        { error: '密码错误', remainingAttempts: remaining },
        { status: 401 }
      )
    }

    // 登录成功，清除失败记录
    resetAttempts(ip)

    // 明文密码自动升级为 bcrypt
    if (needsUpgrade) {
      const hashed = await bcrypt.hash(password, 10)
      await prisma.$executeRawUnsafe(
        `UPDATE users SET password = $1 WHERE id = $2`,
        hashed, user.id
      )
    }

    // 生成新 sessionToken，覆盖旧的（单设备登录）
    const sessionToken = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "sessionToken" = $1 WHERE id = $2`,
      sessionToken, user.id
    )

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user

    const res = NextResponse.json({
      message: '登录成功',
      user: userWithoutPassword,
      sessionToken
    })
    res.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
