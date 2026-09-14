import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/user/settings - 获取用户设置
export async function GET(request: NextRequest) {
  try {
    // 会话归属校验：只能读取自己的设置
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }

    if (auth.userId !== parseInt(userId)) {
      return NextResponse.json({ error: '无权查看该用户设置' }, { status: 403 })
    }

    const user = await prisma.$queryRaw`
      SELECT 
        notifyEmail, notifySite, notifyComment, notifyLike, notifyFollow,
        profilePublic, showEmail, showLocation, showWebsite, allowComment, showStats
      FROM users
      WHERE id = ${parseInt(userId)}
      LIMIT 1
    `

    if (!Array.isArray(user) || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const settings = user[0]
    
    // 转换 SQLite 的 0/1 为布尔值
    return NextResponse.json({
      notifications: {
        email: Boolean(settings.notifyEmail),
        site: Boolean(settings.notifySite),
        comment: Boolean(settings.notifyComment),
        like: Boolean(settings.notifyLike),
        follow: Boolean(settings.notifyFollow),
      },
      privacy: {
        profilePublic: Boolean(settings.profilePublic),
        showEmail: Boolean(settings.showEmail),
        showLocation: Boolean(settings.showLocation),
        showWebsite: Boolean(settings.showWebsite),
        allowComment: Boolean(settings.allowComment),
        showStats: Boolean(settings.showStats),
      }
    })
  } catch (error: any) {
    console.error('获取用户设置失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}

// PUT /api/user/settings - 更新用户设置
export async function PUT(request: NextRequest) {
  try {
    // 会话归属校验：只能修改自己的设置
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { userId, type, settings } = body

    if (!userId || !type || !settings) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    if (auth.userId !== parseInt(userId)) {
      return NextResponse.json({ error: '无权修改该用户设置' }, { status: 403 })
    }

    if (type === 'notifications') {
      // 更新通知设置
      await prisma.$executeRaw`
        UPDATE users 
        SET 
          "notifyEmail" = ${!!settings.email},
          "notifySite" = ${!!settings.site},
          "notifyComment" = ${!!settings.comment},
          "notifyLike" = ${!!settings.like},
          "notifyFollow" = ${!!settings.follow},
          "updatedAt" = NOW()
        WHERE id = ${parseInt(userId)}
      `
    } else if (type === 'privacy') {
      // 更新隐私设置
      await prisma.$executeRaw`
        UPDATE users 
        SET 
          "profilePublic" = ${!!settings.profilePublic},
          "showEmail" = ${!!settings.showEmail},
          "showLocation" = ${!!settings.showLocation},
          "showWebsite" = ${!!settings.showWebsite},
          "allowComment" = ${!!settings.allowComment},
          "showStats" = ${!!settings.showStats},
          "updatedAt" = NOW()
        WHERE id = ${parseInt(userId)}
      `
    } else {
      return NextResponse.json({ error: '无效的设置类型' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: '设置已保存' })
  } catch (error: any) {
    console.error('更新用户设置失败:', error)
    return NextResponse.json({ error: '更新失败: ' + error.message }, { status: 500 })
  }
}
