import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notification'

// POST /api/user/follow - 关注/取消关注
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { followerId, followingId } = body

    if (!followerId || !followingId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: '不能关注自己' }, { status: 400 })
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.$queryRaw`
      SELECT id FROM users WHERE id = ${parseInt(followingId)} LIMIT 1
    `
    if (!Array.isArray(targetUser) || targetUser.length === 0) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 })
    }

    // 检查是否已经关注
    const existing = await prisma.$queryRaw`
      SELECT id FROM follows 
      WHERE "followerId" = ${parseInt(followerId)} AND "followingId" = ${parseInt(followingId)}
      LIMIT 1
    `

    if (Array.isArray(existing) && existing.length > 0) {
      // 已关注 -> 取消关注
      await prisma.$executeRaw`
        DELETE FROM follows 
        WHERE "followerId" = ${parseInt(followerId)} AND "followingId" = ${parseInt(followingId)}
      `
      return NextResponse.json({ following: false, message: '已取消关注' })
    } else {
      // 未关注 -> 关注
      await prisma.$executeRaw`
        INSERT INTO follows ("followerId", "followingId", "createdAt")
        VALUES (${parseInt(followerId)}, ${parseInt(followingId)}, NOW())
      `

      // 发送关注通知
      createNotification({
        userId: parseInt(followingId),
        type: 'follow',
        title: '有人关注了你',
        content: '',
        link: `/user-center`,
        relatedUserId: parseInt(followerId),
      }).catch(() => {})

      return NextResponse.json({ following: true, message: '关注成功' })
    }
  } catch (error: any) {
    console.error('关注操作失败:', error)
    return NextResponse.json({ error: '操作失败: ' + error.message }, { status: 500 })
  }
}

// GET /api/user/follow - 获取关注状态/数量/列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetId = searchParams.get('targetId')
    const type = searchParams.get('type') || 'status' // status | followers | following | count | list
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }

    if (type === 'count') {
      // 获取关注数和粉丝数
      const [followingCount, followerCount] = await Promise.all([
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM follows WHERE "followerId" = ${parseInt(userId)}
        `,
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM follows WHERE "followingId" = ${parseInt(userId)}
        `
      ])

      return NextResponse.json({
        following: Number((followingCount as any)[0]?.count || 0),
        followers: Number((followerCount as any)[0]?.count || 0),
      })
    }

    if (type === 'list') {
      // 获取粉丝列表或关注列表
      const listType = searchParams.get('listType') || 'followers' // 'followers' | 'following'
      
      if (listType === 'followers') {
        // 粉丝列表（谁关注了我）
        const users = await prisma.$queryRawUnsafe(`
          SELECT 
            u.id, u.username, u."avatarUrl", u.bio,
            f."createdAt" as "followAt"
          FROM follows f
          JOIN users u ON f."followerId" = u.id
          WHERE f."followingId" = ${parseInt(userId)}
          ORDER BY f."createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `)
        
        const totalResult = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM follows WHERE "followingId" = ${parseInt(userId)}
        `)
        const total = Number((totalResult as any[])[0]?.count || 0)

        return NextResponse.json({
          users: (users as any[]).map((u: any) => ({
            id: Number(u.id),
            username: u.username,
            avatarUrl: u.avatarUrl,
            bio: u.bio?.length > 50 ? u.bio.slice(0, 50) + '...' : u.bio,
            followAt: u.followAt,
          })),
          total,
          page,
          totalPages: Math.ceil(total / limit),
        })
      }

      if (listType === 'following') {
        // 关注列表（我关注了谁）
        const users = await prisma.$queryRawUnsafe(`
          SELECT 
            u.id, u.username, u."avatarUrl", u.bio,
            f."createdAt" as "followAt"
          FROM follows f
          JOIN users u ON f."followingId" = u.id
          WHERE f."followerId" = ${parseInt(userId)}
          ORDER BY f."createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `)

        const totalResult = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM follows WHERE "followerId" = ${parseInt(userId)}
        `)
        const total = Number((totalResult as any[])[0]?.count || 0)

        return NextResponse.json({
          users: (users as any[]).map((u: any) => ({
            id: Number(u.id),
            username: u.username,
            avatarUrl: u.avatarUrl,
            bio: u.bio?.length > 50 ? u.bio.slice(0, 50) + '...' : u.bio,
            followAt: u.followAt,
          })),
          total,
          page,
          totalPages: Math.ceil(total / limit),
        })
      }
    }

    if (type === 'status' && targetId) {
      // 检查是否已关注
      const result = await prisma.$queryRaw`
        SELECT id FROM follows 
        WHERE "followerId" = ${parseInt(userId)} AND "followingId" = ${parseInt(targetId)}
        LIMIT 1
      `
      return NextResponse.json({
        following: Array.isArray(result) && result.length > 0
      })
    }

    return NextResponse.json({ error: '无效的请求类型' }, { status: 400 })
  } catch (error: any) {
    console.error('获取关注信息失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}
