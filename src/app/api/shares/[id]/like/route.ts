import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canLike, incrementLikeCount } from '@/lib/daily-limit'
import { createNotification } from '@/lib/notification'

// GET /api/shares/[id]/like  获取当前点赞数
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shareId = parseInt(params.id)
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: { likes: true }
    })
    if (!share) return NextResponse.json({ error: '分享不存在' }, { status: 404 })
    return NextResponse.json({ likes: share.likes })
  } catch (error) {
    console.error('获取点赞数失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// POST /api/shares/[id]/like  点赞/取消点赞
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shareId = parseInt(params.id)
    const body = await request.json()
    const { action, userId = 1 } = body // 'like' | 'unlike'

    // 点赞时检查次数限制
    if (action === 'like') {
      const { allowed, remaining } = await canLike(userId)
      if (!allowed) {
        return NextResponse.json({ 
          error: `今日点赞次数已达上限（每天5次），请明天再试` 
        }, { status: 429 })
      }
    }

    const share = await prisma.share.update({
      where: { id: shareId },
      data: {
        likes: action === 'like' ? { increment: 1 } : { decrement: 1 }
      }
    })

    // 增加用户点赞次数
    if (action === 'like') {
      await incrementLikeCount(userId)

      // 发送点赞通知（不阻塞主流程）
      if (Number(userId) !== share.userId) {
        createNotification({
          userId: share.userId,
          type: 'like',
          title: '有人赞了你的分享',
          content: '',
          link: `/user-share`,
          relatedUserId: Number(userId),
        }).catch(() => {})
      }
    }

    return NextResponse.json({ likes: share.likes })
  } catch (error) {
    console.error('点赞操作失败:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
