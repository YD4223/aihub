import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/shares?type=tool|life&toolId=&sort=new|hot&page=1&limit=10&search=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'tool'
  const toolId = searchParams.get('toolId')
  const sort = searchParams.get('sort') || 'new'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '24')
  const search = searchParams.get('search') || ''
  const skip = (page - 1) * limit

  try {
    let whereClause = "WHERE s.status = 'approved'"
    // 按类型筛选
    if (type === 'tool') {
      whereClause += ` AND s.type = 'tool'`
    } else if (type === 'life') {
      whereClause += ` AND s.type = 'life'`
    }
    if (toolId) {
      whereClause += ` AND s."toolId" = ${parseInt(toolId)}`
    }
    if (search) {
      const lowerSearch = search.toLowerCase()
      whereClause += ` AND (LOWER(s.content) LIKE '%${lowerSearch}%' OR LOWER(u.username) LIKE '%${lowerSearch}%' OR LOWER(t.name) LIKE '%${lowerSearch}%')`
    }

    const orderBy = sort === 'hot' ? 's.likes DESC, s."createdAt" DESC' : 's."createdAt" DESC'

    // 获取分享列表 - 使用子查询避免GROUP BY问题
    const shares = await prisma.$queryRawUnsafe(`
      SELECT 
        s.id, s.content, s.images, s.video, s.likes, s.status, s.type, s."createdAt", s."userId",
        s."toolId", s."submitToolName", s."submitToolWebsite", s."submitToolDesc",
        s."submitToolCategory", s."submitToolPricing", s."submitToolGithub", s."submitToolLogo",
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        t.name as "toolName",
        t.slug as "toolSlug",
        t."shortDesc" as "toolShortDesc",
        t.description as "toolDescription",
        t."websiteUrl" as "toolWebsiteUrl",
        t.tags as "toolTags",
        c.name as "categoryName",
        c.slug as "categorySlug",
        (SELECT COUNT(*) FROM share_comments sc WHERE sc."shareId" = s.id AND (sc.status IS NULL OR sc.status = 'approved')) as "commentsCount"
      FROM shares s
      LEFT JOIN users u ON s."userId" = u.id
      LEFT JOIN tools t ON s."toolId" = t.id
      LEFT JOIN categories c ON t."categoryId" = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${skip}
    `)

    // 格式化数据
    const formattedShares = (shares as any[]).map(s => ({
      id: s.id,
      content: s.content,
      images: s.images ? JSON.parse(s.images) : null,
      video: s.video,
      likes: s.likes,
      status: s.status,
      type: s.type,
      createdAt: s.createdAt,
      user: {
        id: s.userId,
        username: s.userName,
        avatarUrl: s.userAvatarUrl
      },
      // 优先使用用户提交的工具信息，如果没有则使用关联的工具信息
      tool: s.toolId ? {
        id: s.toolId,
        name: s.toolName,
        slug: s.toolSlug,
        shortDesc: s.toolShortDesc,
        description: s.toolDescription,
        websiteUrl: s.toolWebsiteUrl,
        tags: s.toolTags,
        category: s.categoryName ? {
          name: s.categoryName,
          slug: s.categorySlug
        } : null
      } : (s.submitToolName ? {
        id: null,
        name: s.submitToolName,
        slug: null,
        shortDesc: s.submitToolDesc,
        description: s.submitToolDesc,
        websiteUrl: s.submitToolWebsite,
        tags: null,
        category: null
      } : null),
      _count: {
        comments: Number(s.commentsCount || 0)
      }
    }))

    // 获取总数
    const totalResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM shares s
      LEFT JOIN users u ON s."userId" = u.id
      LEFT JOIN tools t ON s."toolId" = t.id
      ${whereClause}
    `)
    const total = Number((totalResult as any)[0].count)

    return NextResponse.json({
      shares: formattedShares,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('获取分享失败:', error)
    return NextResponse.json({ error: '获取失败: ' + error.message }, { status: 500 })
  }
}

// POST /api/shares  发布分享（需要登录）
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let type: string, content: string, toolId: string | null, images: string[] | null, userId: string, video: string | null = null
    
    if (contentType.includes('multipart/form-data')) {
      // 处理视频上传
      const formData = await request.formData()
      type = formData.get('type') as string
      content = formData.get('content') as string
      toolId = formData.get('toolId') as string
      userId = formData.get('userId') as string
      const videoFile = formData.get('video') as File
      
      if (videoFile) {
        // 视频校验
        const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
        const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v']
        
        if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
          return NextResponse.json({ error: '仅支持 MP4、MOV、M4V 格式的视频' }, { status: 400 })
        }
        
        if (videoFile.size > MAX_VIDEO_SIZE) {
          return NextResponse.json({ error: '视频大小不能超过 100MB' }, { status: 400 })
        }
        
        // 将视频转为 base64（实际项目应该上传到 OSS/CDN）
        const bytes = await videoFile.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        video = `data:${videoFile.type};base64,${base64}`
      }
      images = null
    } else {
      // 处理 JSON 请求（图片上传）
      const body = await request.json()
      type = body.type
      content = body.content
      toolId = body.toolId
      images = body.images
      userId = body.userId
      video = null
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    // 工具圈分享必须关联工具
    if (type === 'tool' && !toolId) {
      return NextResponse.json({ error: '请关联一个工具' }, { status: 400 })
    }

    // 使用原始 SQL 创建分享
    // 站长发布自动通过，并自动置顶24小时
    let shareStatus = 'pending'
    const poster = await prisma.user.findUnique({ where: { id: parseInt(userId) }, select: { role: true } })
    const isAdmin = poster?.role === 'ADMIN'
    if (isAdmin) shareStatus = 'approved'
    
    const imagesJson = images ? JSON.stringify(images) : null
    const shareType = type || 'tool'
    const toolIdValue = toolId ? parseInt(toolId) : null
    const userIdInt = parseInt(userId)
    
    let result
    if (isAdmin) {
      result = await prisma.$queryRawUnsafe(
        `INSERT INTO shares (type, content, "toolId", "userId", images, video, status, "pinnedUntil", likes, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '24 hours', 0, NOW(), NOW())
         RETURNING *`,
        shareType, content.trim(), toolIdValue, userIdInt, imagesJson, video, shareStatus
      )
    } else {
      result = await prisma.$queryRaw`
        INSERT INTO shares (type, content, "toolId", "userId", images, video, status, likes, "createdAt", "updatedAt")
        VALUES (${shareType}, ${content.trim()}, ${toolIdValue}, ${parseInt(userId)}, ${imagesJson}, ${video}, ${shareStatus}, 0, NOW(), NOW())
        RETURNING *
      `
    }
    const share = (result as any[])[0]

    // 获取关联数据
    const shareWithData = await prisma.$queryRaw`
      SELECT 
        s.*,
        u.username as "userName",
        u."avatarUrl" as "userAvatarUrl",
        t.name as "toolName",
        t.slug as "toolSlug",
        t."shortDesc" as "toolShortDesc",
        t.description as "toolDescription",
        t."websiteUrl" as "toolWebsiteUrl",
        c.name as "categoryName",
        c.slug as "categorySlug"
      FROM shares s
      LEFT JOIN users u ON s."userId" = u.id
      LEFT JOIN tools t ON s."toolId" = t.id
      LEFT JOIN categories c ON t."categoryId" = c.id
      WHERE s.id = ${share.id}
    `

    const formattedShare = {
      ...share,
      user: {
        id: share.userId,
        username: (shareWithData as any[])[0]?.userName,
        avatarUrl: (shareWithData as any[])[0]?.userAvatarUrl
      },
      tool: {
        id: share.toolId,
        name: (shareWithData as any[])[0]?.toolName,
        slug: (shareWithData as any[])[0]?.toolSlug,
        shortDesc: (shareWithData as any[])[0]?.toolShortDesc,
        description: (shareWithData as any[])[0]?.toolDescription,
        websiteUrl: (shareWithData as any[])[0]?.toolWebsiteUrl,
        category: (shareWithData as any[])[0]?.categoryName ? {
          name: (shareWithData as any[])[0]?.categoryName,
          slug: (shareWithData as any[])[0]?.categorySlug
        } : null
      }
    }

    // 触发 AI 自动互动（异步，不阻塞响应）
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/ai/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'share',
          targetId: share.id,
          content: content.trim(),
          authorName: (shareWithData as any[])[0]?.userName || '用户',
          authorId: parseInt(userId),
          context: (shareWithData as any[])[0]?.toolName || undefined
        })
      }).catch(err => console.error('AI 互动触发失败:', err))
    } catch (e) {
      // AI 互动失败不影响主流程
      console.error('AI 互动触发异常:', e)
    }

    return NextResponse.json({ share: formattedShare }, { status: 201 })
  } catch (error: any) {
    console.error('发布分享失败:', error)
    return NextResponse.json({ error: '发布失败: ' + error.message }, { status: 500 })
  }
}