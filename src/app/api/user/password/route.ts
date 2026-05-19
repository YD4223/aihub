import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// PUT /api/user/password - 修改密码
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, currentPassword, newPassword } = body

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    // 获取用户当前密码
    const user = await prisma.$queryRaw`
      SELECT password, "githubId" FROM users 
      WHERE id = ${parseInt(userId)}
      LIMIT 1
    `

    if (!Array.isArray(user) || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const storedPassword = user[0].password
    const githubId = user[0].githubId

    // GitHub 用户（空密码）可以直接设置密码，无需验证旧密码
    const isGithubOnlyUser = githubId && storedPassword === ''
    if (!isGithubOnlyUser) {
      let isValid = false

      if (storedPassword.startsWith('$2')) {
        isValid = await bcrypt.compare(currentPassword, storedPassword)
      } else {
        isValid = storedPassword === currentPassword
      }

      if (!isValid) {
        return NextResponse.json({ error: '当前密码错误' }, { status: 400 })
      }
    }

    // 新密码长度验证
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少需要6位' }, { status: 400 })
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.$executeRaw`
      UPDATE users 
      SET password = ${hashedPassword},
          "updatedAt" = NOW()
      WHERE id = ${parseInt(userId)}
    `

    return NextResponse.json({ success: true, message: '密码修改成功' })
  } catch (error: any) {
    console.error('修改密码失败:', error)
    return NextResponse.json({ error: '修改失败: ' + error.message }, { status: 500 })
  }
}
