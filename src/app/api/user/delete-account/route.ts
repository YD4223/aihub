import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/user/delete-account - 注销账户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, password } = body

    if (!userId || !password) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    // 1. 获取用户信息
    const user = await prisma.$queryRawUnsafe<Array<{ id: number; password: string; githubId: string | null }>>(
      'SELECT id, password, "githubId" FROM users WHERE id = $1 LIMIT 1',
      parseInt(userId)
    )

    if (!Array.isArray(user) || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const storedPassword = user[0].password
    const isGithubOnly = user[0].githubId && storedPassword === ''

    // GitHub 用户无需密码验证，可直接注销
    if (!isGithubOnly) {
      let isValid = false
      if (storedPassword.startsWith('$2')) {
        isValid = await bcrypt.compare(password, storedPassword)
      } else {
        isValid = storedPassword === password
      }
      if (!isValid) {
        return NextResponse.json({ error: '密码错误，无法注销账户' }, { status: 400 })
      }
    }

    // 2. 按顺序删除用户所有关联数据（每个删除单独try-catch，避免某张表不存在时报错）
    const uid = parseInt(userId)

    const safeDelete = async (sql: string, ...params: any[]) => {
      try { await prisma.$executeRawUnsafe(sql, ...params) } catch (e) { /* 表不存在跳过 */ }
    }

    await safeDelete('DELETE FROM pet_task_progress WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM user_pets WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM user_visit_streaks WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM user_daily_limits WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM follows WHERE "followerId" = $1 OR "followingId" = $2', uid, uid)
    await safeDelete('DELETE FROM share_comments WHERE "shareId" IN (SELECT id FROM shares WHERE "userId" = $1)', uid)
    await safeDelete('DELETE FROM share_comments WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM shares WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM comments WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM view_records WHERE "userId" = $1', uid)
    await safeDelete('DELETE FROM reports WHERE "reporterId" = $1', uid)
    await safeDelete('DELETE FROM ai_interactions WHERE "aiUserId" = $1', uid)
    await safeDelete('DELETE FROM users WHERE id = $1', uid)

    return NextResponse.json({ success: true, message: '账户已成功注销' })
  } catch (error: any) {
    console.error('注销账户失败:', error)
    return NextResponse.json({ error: '注销失败: ' + error.message }, { status: 500 })
  }
}
