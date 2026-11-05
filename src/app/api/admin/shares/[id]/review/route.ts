import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'
import { addExp } from '@/lib/add-exp'
import { EXP_RULES } from '@/lib/level'
import { checkAndUnlock } from '@/lib/check-achievements'
import { createNotification } from '@/lib/notification'

// POST /api/admin/shares/[id]/review  审核分享/下架/恢复
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const shareId = parseInt(params.id)
    const body = await request.json()
    const { action, note } = body // action: 'approve' | 'reject' | 'suspend' | 'restore'

    if (!['approve', 'reject', 'suspend', 'restore'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 })
    }

    let updateData: any = {}
    
    switch (action) {
      case 'approve':
        updateData = { status: 'approved', reviewNote: note || null, reviewedAt: new Date() }
        break
      case 'reject':
        updateData = { status: 'rejected', reviewNote: note || null, reviewedAt: new Date() }
        break
      case 'suspend':
        updateData = { status: 'suspended', suspendedReason: note || null, suspendedAt: new Date() }
        break
      case 'restore':
        updateData = { status: 'approved', suspendedReason: null, suspendedAt: null }
        break
    }

    const share = await prisma.share.update({
      where: { id: shareId },
      data: updateData
    })

    // 通知分享作者（非恢复操作）
    if (action !== 'restore') {
      const actionLabel = action === 'approve' ? '已通过' : action === 'reject' ? '未通过' : '已下架'
      const shareTypeLabel = share.type === 'tool' ? '工具分享' : share.type === 'tech_share' ? '技术分享' : share.type === 'qa_help' ? '问答求助' : '生活圈动态'
      createNotification({
        userId: share.userId,
        type: 'system',
        title: `${shareTypeLabel}${actionLabel}`,
        content: `你的${shareTypeLabel}${actionLabel}${note ? `: ${note}` : ''}`,
        link: '/user-center?tab=submissions'
      }).catch(() => {})
    }

    // 审核通过时给分享作者加经验
    if (action === 'approve') {
      addExp(share.userId, EXP_RULES.CREATE_SHARE).catch(() => {})
      // 成就检查
      checkAndUnlock(share.userId).catch(() => {})
    }

    return NextResponse.json({ share })
  } catch (error) {
    console.error('审核失败:', error)
    return NextResponse.json({ error: '审核失败' }, { status: 500 })
  }
}
