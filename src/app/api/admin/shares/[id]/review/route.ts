import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'

// POST /api/admin/shares/[id]/review  审核分享/下架/恢复
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    return NextResponse.json({ share })
  } catch (error) {
    console.error('审核失败:', error)
    return NextResponse.json({ error: '审核失败' }, { status: 500 })
  }
}
