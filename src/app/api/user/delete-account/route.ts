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

    // 1. 验证密码
    const user = await prisma.$queryRawUnsafe<Array<{ id: number; password: string }>>(
      'SELECT id, password FROM users WHERE id = ? LIMIT 1',
      parseInt(userId)
    )

    if (!Array.isArray(user) || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const storedPassword = user[0].password
    let isValid = false

    if (storedPassword.startsWith('$2')) {
      isValid = await bcrypt.compare(password, storedPassword)
    } else {
      isValid = storedPassword === password
    }

    if (!isValid) {
      return NextResponse.json({ error: '密码错误，无法注销账户' }, { status: 400 })
    }

    // 2. 按顺序删除用户所有关联数据
    const uid = parseInt(userId)

    // 2a. 删除用户宠物的进度数据
    await prisma.$executeRawUnsafe('DELETE FROM pet_task_progress WHERE userId = $1', uid)

    // 2b. 删除用户宠物
    await prisma.$executeRawUnsafe('DELETE FROM user_pets WHERE userId = $1', uid)

    // 2c. 删除用户连续签到记录
    await prisma.$executeRawUnsafe('DELETE FROM user_visit_streaks WHERE userId = $1', uid)

    // 2d. 删除用户每日限制
    await prisma.$executeRawUnsafe('DELETE FROM user_daily_limits WHERE userId = $1', uid)

    // 2e. 删除用户收到的关注（别人关注TA的记录）
    await prisma.$executeRawUnsafe('DELETE FROM follows WHERE followerId = $1 OR followingId = $2', uid, uid)

    // 2f. 删除用户分享下的评论（先于分享删除）
    await prisma.$executeRawUnsafe('DELETE FROM share_comments WHERE shareId IN (SELECT id FROM shares WHERE userId = $1)', uid)

    // 2g. 删除用户的评论（对分享的评论）
    await prisma.$executeRawUnsafe('DELETE FROM share_comments WHERE userId = $1', uid)

    // 2h. 删除用户的分享
    await prisma.$executeRawUnsafe('DELETE FROM shares WHERE userId = $1', uid)

    // 2i. 删除用户对工具的评论
    await prisma.$executeRawUnsafe('DELETE FROM comments WHERE userId = $1', uid)

    // 2j. 删除用户的浏览记录
    await prisma.$executeRawUnsafe('DELETE FROM view_records WHERE userId = $1', uid)

    // 2k. 删除用户提交的反馈
    await prisma.$executeRawUnsafe('DELETE FROM reports WHERE reporterId = $1', uid)

    // 2l. 删除AI互动记录
    await prisma.$executeRawUnsafe('DELETE FROM ai_interactions WHERE aiUserId = $1', uid)

    // 2m. 最后删除用户
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE id = $1', uid)

    return NextResponse.json({ success: true, message: '账户已成功注销' })
  } catch (error: any) {
    console.error('注销账户失败:', error)
    return NextResponse.json({ error: '注销失败: ' + error.message }, { status: 500 })
  }
}
