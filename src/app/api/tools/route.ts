import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tools - 获取工具列表（只返回 approved 的）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const skip = (page - 1) * limit

  const where: any = { 
    status: 'approved',
    isActive: true,
    source: 'crawler'  // 只显示爬虫抓取的官方工具
  }
  
  if (category) where.category = { slug: category }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search, mode: 'insensitive' } }
    ]
  }

  const orderBy: any =
    sort === 'popular' ? { upvotes: 'desc' } :
    sort === 'newest' ? { createdAt: 'desc' } :
    { viewCount: 'desc' }

  const [tools, total] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { name: true, slug: true } }
      }
    }),
    prisma.tool.count({ where })
  ])

  return NextResponse.json({
    tools,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  })
}

// POST /api/tools - 提交新工具（创建 shares 记录，显示在工具圈）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      websiteUrl, 
      shortDesc, 
      description,
      categoryId,
      pricingType,
      githubUrl,
      logoUrl,
      images,
      userId 
    } = body

    // 验证必填字段
    if (!name?.trim()) {
      return NextResponse.json({ error: '工具名称不能为空' }, { status: 400 })
    }
    if (!websiteUrl?.trim()) {
      return NextResponse.json({ error: '官网链接不能为空' }, { status: 400 })
    }
    if (!shortDesc?.trim()) {
      return NextResponse.json({ error: '一句话介绍不能为空' }, { status: 400 })
    }

    // 获取分类名称
    let categoryName = null
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      })
      categoryName = category?.name || null
    }

    // 检查用户是否站长（ADMIN），站长自动通过审核+置顶24小时
    const submitterId = userId ? parseInt(userId) : null
    let toolStatus = 'pending'
    let isAdmin = false
    if (submitterId) {
      const user = await prisma.user.findUnique({ where: { id: submitterId }, select: { role: true } })
      if (user?.role === 'ADMIN') {
        toolStatus = 'approved'
        isAdmin = true
      }
    }

    // 创建 shares 记录（用户提交的工具显示在工具圈）
    const share = await prisma.share.create({
      data: {
        type: 'tool',
        content: description?.trim() || shortDesc.trim(),
        images: images?.length > 0 ? JSON.stringify(images) : null,
        userId: submitterId!,
        status: toolStatus,
        ...(isAdmin ? { pinnedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } : {}),
        // 存储用户提交的工具信息
        submitToolName: name.trim(),
        submitToolWebsite: websiteUrl.trim(),
        submitToolDesc: shortDesc.trim(),
        submitToolCategory: categoryName,
        submitToolPricing: pricingType || 'FREE',
        submitToolGithub: githubUrl?.trim() || null,
        submitToolLogo: logoUrl?.trim() || null
      }
    })

    return NextResponse.json({ 
      share,
      message: toolStatus === 'approved' ? '提交成功，已自动发布' : '提交成功，等待审核' 
    }, { status: 201 })

  } catch (error: any) {
    console.error('提交工具失败:', error)
    console.error('错误详情:', error.message, error.stack)
    return NextResponse.json({ 
      error: '提交失败: ' + (error.message || '请稍后再试')
    }, { status: 500 })
  }
}
