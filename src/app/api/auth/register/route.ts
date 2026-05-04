import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyCode } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { username, email: rawEmail, password, code } = await request.json()
    const email = rawEmail?.toLowerCase()

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: '用户名、邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要6位' },
        { status: 400 }
      )
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    // 校验验证码
    if (!code) {
      return NextResponse.json({ error: '请输入邮箱验证码' }, { status: 400 })
    }
    
    const codeValid = await verifyCode(email, code).catch(() => false)
    if (!codeValid) {
      return NextResponse.json({ error: '验证码错误或已过期，请重新获取' }, { status: 400 })
    }

    // 检查邮箱是否已存在
    const existingEmail = await (prisma as any).user.findUnique({
      where: { email }
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      )
    }

    // 检查用户名是否已存在
    const existingUsername = await (prisma as any).user.findUnique({
      where: { username }
    })

    if (existingUsername) {
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 409 }
      )
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户（emailVerified 用原生 SQL 设置，避免 Prisma Client 版本不同步问题）
    const user = await (prisma as any).user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER',
      }
    })

    // 设置邮箱验证时间（通过原生 SQL，绕过 Prisma Client 缓存问题）
    await prisma.$executeRaw`UPDATE users SET emailVerified = NOW() WHERE id = ${user.id}`

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: '注册成功',
      user: userWithoutPassword
    })
  } catch (error: any) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '注册失败: ' + (error.message || '请稍后重试') },
      { status: 500 }
    )
  }
}
