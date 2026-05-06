import { NextRequest, NextResponse } from 'next/server'
import { generateCode, saveVerificationCode, sendVerificationCode } from '@/lib/email'
import { prisma } from '@/lib/prisma'

// 频率限制：记录每个邮箱的最近发送时间
const sendCooldowns = new Map<string, number>()
const COOLDOWN_MS = 60 * 1000 // 60秒冷却

// 全局 IP 频率限制：每IP每分钟最多5次
const ipLimits = new Map<string, { count: number; resetAt: number }>()
const IP_MAX_PER_MINUTE = 5

// 写入验证码发送日志（静默失败，不影响主流程）
async function logVerification(params: {
  email: string
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  reason?: string
}) {
  try {
    const successVal = params.success ? 1 : 0
    const reasonVal = params.reason || null
    await prisma.$executeRawUnsafe(
      `INSERT INTO verification_logs (email, "ipAddress", "userAgent", "sentAt", success, reason) VALUES ($1, $2, $3, NOW(), $4, $5)`,
      params.email, params.ipAddress, params.userAgent, successVal, reasonVal
    )
  } catch (err) {
    // 日志写入失败不影响主流程
    console.error('[VerificationLog] 写入失败:', err)
  }
}

// 发送邮箱验证码
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '请输入邮箱地址' }, { status: 400 })
    }

    // 邮箱格式校验（仅支持QQ邮箱）
    if (!email.endsWith('@qq.com')) {
      return NextResponse.json({ error: '目前仅支持QQ邮箱注册' }, { status: 400 })
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = request.headers.get('user-agent') || null

    // 防线1：IP 频率限制（防刷接口）
    const now = Date.now()
    const ipLimit = ipLimits.get(clientIp)
    
    if (ipLimit && now < ipLimit.resetAt) {
      if (ipLimit.count >= IP_MAX_PER_MINUTE) {
        await logVerification({
          email, ipAddress: clientIp, userAgent,
          success: false, reason: 'IP频率限制'
        })
        return NextResponse.json(
          { error: '请求过于频繁，请1分钟后再试' },
          { status: 429 }
        )
      }
      ipLimit.count++
    } else {
      ipLimits.set(clientIp, { count: 1, resetAt: now + 60 * 1000 })
    }

    // 防线2：同邮箱60秒冷却（防重复发送）
    const lastSent = sendCooldowns.get(email.toLowerCase())
    if (lastSent && now - lastSent < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastSent)) / 1000)
      await logVerification({
        email, ipAddress: clientIp, userAgent,
        success: false, reason: `邮箱冷却中，剩余${remaining}秒`
      })
      return NextResponse.json(
        { error: `请${remaining}秒后再试` },
        { status: 429 }
      )
    }

    // 防线3：检查邮箱是否已注册
    const existingUser = await (prisma as any).user.findUnique({
      where: { email: email.toLowerCase() }
    })
    if (existingUser) {
      await logVerification({
        email, ipAddress: clientIp, userAgent,
        success: false, reason: '邮箱已注册，拒绝发送'
      })
      return NextResponse.json({ message: '该邮箱已注册，请直接登录' }, { status: 400 })
    }

    const code = generateCode()
    console.log(`[SendCode] 验证码: ${code} -> ${email}`)

    // 保存验证码到数据库（5分钟有效）
    await saveVerificationCode(email, code)

    // 记录发送时间（冷却计时）
    sendCooldowns.set(email.toLowerCase(), now)

    // 发送邮件
    const result = await sendVerificationCode(email, code)
    
    if (!result.success) {
      await logVerification({
        email, ipAddress: clientIp, userAgent,
        success: false, reason: `邮件发送失败: ${result.error}`
      })
      console.error('[SendCode] 邮件发送失败:', result.error)
      return NextResponse.json({ error: `发送失败: ${result.error}` }, { status: 500 })
    }

    // 记录成功日志
    await logVerification({
      email, ipAddress: clientIp, userAgent,
      success: true, reason: '验证码发送成功'
    })

    // 安全返回：不暴露具体邮箱是否发送成功
    return NextResponse.json({ message: '如果该邮箱未注册，验证码已发送' })
  } catch (error: any) {
    console.error('[SendCode] 错误:', error)
    return NextResponse.json({ error: `系统错误: ${error?.message || '未知错误'}` }, { status: 500 })
  }
}
