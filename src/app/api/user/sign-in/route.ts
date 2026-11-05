import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { getLevelByExp, EXP_RULES } from '@/lib/level'
import { checkAndUnlock } from '@/lib/check-achievements'

// POST /api/user/sign-in
export async function POST(request: NextRequest) {
  try {
    // 会话归属校验：只能给自己签到（防冒名刷经验）
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { userId: bodyUserId } = await request.json()
    const userId = auth.userId
    if (bodyUserId && parseInt(bodyUserId) !== userId) {
      return NextResponse.json({ error: '无权替他人签到' }, { status: 403 })
    }

    const today = new Date().toISOString().split('T')[0]

    // 检查今天是否已签到
    const existing = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id FROM user_sign_ins WHERE "userId" = $1 AND "signInDate" = $2::date`,
      userId, today
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: '今天已签到', signedIn: true })
    }

    // 计算连续签到天数
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const lastSignIn = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT streak FROM user_sign_ins WHERE "userId" = $1 AND "signInDate" = $2::date LIMIT 1`,
      userId, yesterdayStr
    )

    const streak = lastSignIn.length > 0 ? lastSignIn[0].streak + 1 : 1

    // 插入签到记录
    await prisma.$queryRawUnsafe(
      `INSERT INTO user_sign_ins ("userId", "signInDate", streak) VALUES ($1, $2::date, $3)`,
      userId, today, streak
    )

    // 计算经验：签到基础 + 连续加成
    const expGain = EXP_RULES.SIGN_IN + (streak - 1) * EXP_RULES.STREAK_BONUS

    // 更新用户经验
    const result = await prisma.$queryRawUnsafe<Array<any>>(
      `UPDATE users SET exp = exp + $1 WHERE id = $2 RETURNING exp`,
      expGain, userId
    )

    const totalExp = Number(result[0]?.exp || 0)
    const newLevel = getLevelByExp(totalExp)

    // 更新等级
    await prisma.$executeRawUnsafe(
      `UPDATE users SET level = $1 WHERE id = $2`,
      newLevel, userId
    )

    // 成就检查
    checkAndUnlock(userId).catch(() => {})

    return NextResponse.json({
      success: true,
      expGain,
      streak,
      totalExp,
      level: newLevel
    })
  } catch (error) {
    console.error('签到失败:', error)
    return NextResponse.json({ error: '签到失败' }, { status: 500 })
  }
}

// GET /api/user/sign-in?userId=xxx
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: '缺少userId' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const [signedIn, user] = await Promise.all([
    prisma.$queryRawUnsafe<Array<any>>(
      `SELECT streak FROM user_sign_ins WHERE "userId" = $1 AND "signInDate" = $2::date LIMIT 1`,
      parseInt(userId), today
    ),
    prisma.$queryRawUnsafe<Array<any>>(
      `SELECT exp, level FROM users WHERE id = $1`,
      parseInt(userId)
    ),
  ])

  return NextResponse.json({
    signedIn: signedIn.length > 0,
    streak: signedIn[0]?.streak || 0,
    exp: Number(user[0]?.exp || 0),
    level: Number(user[0]?.level || 1),
  })
}
