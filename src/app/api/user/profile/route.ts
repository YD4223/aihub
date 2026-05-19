import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/user/profile - 更新用户资料
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, username, email, bio, location, website, avatarUrl } = body

    if (!userId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 })
    }

    // 检查用户名是否已被其他用户使用
    if (username) {
      const existingUser = await prisma.$queryRaw`
        SELECT id FROM users 
        WHERE username = ${username} 
        AND id != ${parseInt(userId)}
        LIMIT 1
      `
      if (Array.isArray(existingUser) && existingUser.length > 0) {
        return NextResponse.json({ error: '用户名已被使用' }, { status: 400 })
      }
    }

    // 检查邮箱是否已被其他用户使用
    if (email) {
      const existingEmail = await prisma.$queryRaw`
        SELECT id FROM users 
        WHERE email = ${email} 
        AND id != ${parseInt(userId)}
        LIMIT 1
      `
      if (Array.isArray(existingEmail) && existingEmail.length > 0) {
        return NextResponse.json({ error: '邮箱已被使用' }, { status: 400 })
      }
    }

    // 更新用户资料
    await prisma.$executeRaw`
      UPDATE users 
      SET 
        username = ${username || ''},
        email = ${email || null},
        bio = ${bio || null},
        location = ${location || null},
        website = ${website || null},
        "updatedAt" = NOW()
      WHERE id = ${parseInt(userId)}
    `

    // 如果传了 avatarUrl，单独更新（支持设为 null 清除头像）
    if (avatarUrl !== undefined) {
      await prisma.$executeRaw`
        UPDATE users 
        SET "avatarUrl" = ${avatarUrl || null},
            "updatedAt" = NOW()
        WHERE id = ${parseInt(userId)}
      `
    }

    // 获取更新后的用户信息
    const updatedUser = await prisma.$queryRaw`
      SELECT id, username, email, "avatarUrl", bio, location, website, "githubId", "createdAt"
      FROM users
      WHERE id = ${parseInt(userId)}
      LIMIT 1
    `

    return NextResponse.json({ 
      success: true, 
      user: Array.isArray(updatedUser) ? updatedUser[0] : updatedUser 
    })
  } catch (error: any) {
    console.error('更新用户资料失败:', error)
    return NextResponse.json({ error: '更新失败: ' + error.message }, { status: 500 })
  }
}
