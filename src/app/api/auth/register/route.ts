import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { verifyCode } from '@/lib/email'

// 写入验证码日志
async function logVerification(params: {
  email: string
  success: boolean
  reason?: string
}) {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO verification_logs (email, "ipAddress", "userAgent", "sentAt", success, reason) VALUES ($1, $2, $3, NOW(), $4, $5)`,
      params.email, null, null, params.success, params.reason || null
    )
  } catch (err) {
    // 日志写入失败不影响主流程
  }
}

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

    // 邮箱格式校验（仅支持QQ邮箱）
    if (!email.endsWith('@qq.com')) {
      return NextResponse.json({ error: '目前仅支持QQ邮箱注册' }, { status: 400 })
    }

    // 校验验证码
    if (!code) {
      return NextResponse.json({ error: '请输入邮箱验证码' }, { status: 400 })
    }
    
    const codeValid = await verifyCode(email, code).catch(() => false)
    if (!codeValid) {
      await logVerification({ email, success: false, reason: '注册失败：验证码错误或已过期' })
      return NextResponse.json({ error: '验证码错误或已过期，请重新获取' }, { status: 400 })
    }

    // 检查邮箱是否已存在
    const existingEmail = await (prisma as any).user.findUnique({
      where: { email }
    })

    if (existingEmail) {
      await logVerification({ email, success: false, reason: '注册失败：邮箱已注册' })
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
      await logVerification({ email, success: false, reason: '注册失败：用户名已存在' })
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 409 }
      )
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await (prisma as any).user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER',
        emailVerified: new Date(),
      }
    })

    // 生成 sessionToken
    const sessionToken = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "sessionToken" = $1 WHERE id = ${user.id}`,
      sessionToken
    )

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user

    await logVerification({ email, success: true, reason: '注册成功' })

    return NextResponse.json({
      message: '注册成功',
      user: userWithoutPassword,
      sessionToken
    })
  } catch (error: any) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '注册失败: ' + (error.message || '请稍后重试') },
      { status: 500 }
    )
  }
}
