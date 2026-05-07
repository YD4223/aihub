import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      )
    }

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

    const response = NextResponse.json({
      message: '登录成功',
      user: userWithoutPassword,
      sessionToken
    })
    // 设置 cookie 供中间件校验登录状态
    response.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    })
    return response
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
