import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/user/avatar - 上传头像
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const userId = formData.get('userId') as string
    const file = formData.get('avatar') as File

    if (!userId || !file) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '只支持 JPG/PNG/GIF/WebP 格式' }, { status: 400 })
    }

    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '头像文件不能超过 2MB' }, { status: 400 })
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 生成文件名：userId_时间戳.扩展名
    const ext = file.type.split('/')[1] || 'png'
    const filename = `user_${userId}_${Date.now()}.${ext}`

    // 确保目录存在
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars')
    await mkdir(avatarsDir, { recursive: true })

    // 写入文件
    const filepath = path.join(avatarsDir, filename)
    await writeFile(filepath, buffer)

    // 头像 URL（相对于 public 目录）
    const avatarUrl = `/avatars/${filename}`

    // 更新数据库
    await prisma.$executeRaw`
      UPDATE users 
      SET avatarUrl = ${avatarUrl},
          updatedAt = NOW()
      WHERE id = ${parseInt(userId)}
    `

    // 获取更新后的用户信息
    const updatedUser = await prisma.$queryRaw`
      SELECT id, username, email, avatarUrl, bio, location, website, createdAt
      FROM users
      WHERE id = ${parseInt(userId)}
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      avatarUrl,
      user: Array.isArray(updatedUser) ? updatedUser[0] : updatedUser
    })
  } catch (error: any) {
    console.error('上传头像失败:', error)
    return NextResponse.json({ error: '上传失败: ' + error.message }, { status: 500 })
  }
}

// DELETE /api/user/avatar - 删除头像（恢复为首字母头像）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }

    // 获取当前头像URL
    const user = await prisma.$queryRaw`
      SELECT avatarUrl FROM users WHERE id = ${parseInt(userId)} LIMIT 1
    `

    if (Array.isArray(user) && user.length > 0 && user[0].avatarUrl) {
      // 清除头像URL
      await prisma.$executeRaw`
        UPDATE users 
        SET avatarUrl = NULL,
            updatedAt = NOW()
        WHERE id = ${parseInt(userId)}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除头像失败:', error)
    return NextResponse.json({ error: '删除失败: ' + error.message }, { status: 500 })
  }
}
