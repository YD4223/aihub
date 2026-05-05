import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/comments?page=&limit=&search=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const skip = (page - 1) * limit

  try {
    // 构建查询条件
    let whereClause1 = 'WHERE 1=1'
    let whereClause2 = 'WHERE 1=1'
    if (search) {
      whereClause1 += ` AND c.content LIKE '%${search}%'`
      whereClause2 += ` AND c.content LIKE '%${search}%'`
    }

    // 获取工具/新闻评论（comments表）- 使用 toolId 关联
    const toolComments = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id,
        c.content,
        c."userId",
        c."toolId",
        c."createdAt",
        c.status,
        c."suspendedAt",
        c."suspendedReason",
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        t.name as "toolName",
        'tool' as "sourceType"
      FROM comments c
      LEFT JOIN users u ON c."userId" = u.id
      LEFT JOIN tools t ON c."toolId" = t.id
      ${whereClause1}
    `)

    // 获取分享评论（share_comments表）- 使用 shareId 关联
    const shareComments = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id,
        c.content,
        c."userId",
        c."shareId",
        c."createdAt",
        c.status,
        c."suspendedAt",
        c."suspendedReason",
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        t.name as "toolName",
        'share' as "sourceType"
      FROM share_comments c
      LEFT JOIN users u ON c."userId" = u.id
      LEFT JOIN shares s ON c."shareId" = s.id
      LEFT JOIN tools t ON s."toolId" = t.id
      ${whereClause2}
    `)

    // 合并所有评论并按时间排序
    const allComments = [
      ...(toolComments as any[]).map(c => ({ ...c, id: `tool_${c.id}` })),
      ...(shareComments as any[]).map(c => ({ ...c, id: `share_${c.id}` }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 分页
    const total = allComments.length
    const paginatedComments = allComments.slice(skip, skip + limit)

    return NextResponse.json({
      comments: paginatedComments,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('获取评论列表失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}

// DELETE /api/admin/comments?id=
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少评论ID' }, { status: 400 })
  }

  try {
    // 解析ID格式：tool_123 或 share_123
    if (id.startsWith('tool_')) {
      const realId = parseInt(id.replace('tool_', ''))
      await prisma.$executeRaw`DELETE FROM comments WHERE id = ${realId}`
    } else if (id.startsWith('share_')) {
      const realId = parseInt(id.replace('share_', ''))
      await prisma.$executeRaw`DELETE FROM share_comments WHERE id = ${realId}`
    } else {
      // 兼容旧格式，默认删除comments表
      await prisma.$executeRaw`DELETE FROM comments WHERE id = ${parseInt(id)}`
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除评论失败:', error)
    return NextResponse.json({ error: '删除失败: ' + error.message }, { status: 500 })
  }
}
