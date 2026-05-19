import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/profile/[id] - 获取用户公开资料（根据隐私设置过滤）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const viewerId = searchParams.get('viewerId')
    const isSelf = viewerId && parseInt(viewerId) === userId

    // 获取用户完整信息（包括隐私设置）
    const user = await prisma.$queryRaw`
      SELECT 
        id, username, "avatarUrl", bio, location, website, "githubId",
        role, status, "createdAt",
        "profilePublic", "showEmail", "showLocation", "showWebsite", "allowComment", "showStats"
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (!Array.isArray(user) || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const userData = user[0]

    // 检查用户是否被封禁
    if (userData.status === 'banned') {
      return NextResponse.json({ error: '该用户已被封禁' }, { status: 403 })
    }

    // 检查资料是否公开（自己查看不受限制）
    if (!isSelf && !userData.profilePublic) {
      return NextResponse.json({ 
        error: '该用户已隐藏个人资料',
        user: {
          id: userData.id,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          profilePublic: false
        }
      })
    }

    // 获取用户的统计数据
    const statsResult = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM shares WHERE "userId" = ${userId} AND status = 'approved') as "shareCount",
        (SELECT COALESCE(SUM(likes), 0) FROM shares WHERE "userId" = ${userId} AND status = 'approved') as "totalLikes"
    `
    const stats = Array.isArray(statsResult) ? statsResult[0] : statsResult

    // 根据隐私设置构建返回数据
    const result: any = {
      id: userData.id,
      username: userData.username,
      avatarUrl: userData.avatarUrl,
      bio: userData.bio,
      role: userData.role,
      createdAt: userData.createdAt,
      allowComment: Boolean(userData.allowComment),
      showStats: Boolean(userData.showStats),
      shareCount: Number(stats?.shareCount || 0),
      totalLikes: Number(stats?.totalLikes || 0),
    }

    // 自己看自己的资料才返回敏感字段
    if (isSelf) {
      result.githubId = userData.githubId
    }

    // 自己查看或设置了公开才显示
    if (isSelf || userData.showEmail) {
      result.email = userData.email
    }
    if (isSelf || userData.showLocation) {
      result.location = userData.location
    }
    if (isSelf || userData.showWebsite) {
      result.website = userData.website
    }

    return NextResponse.json({ user: result })
  } catch (error: any) {
    console.error('获取用户资料失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
