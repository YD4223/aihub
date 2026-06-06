import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notification'
import { uploadImage, parseBase64Image, isR2Configured } from '@/lib/r2'

// CORS 头 + 缓存控制（5分钟CDN缓存，降低Supabase带宽消耗）
const CORS = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, OPTIONS', 
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

// OPTIONS 预检
export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS })
}

// GET /api/tools - 获取工具列表（已关闭外部访问，仅保留内部使用）
export async function GET(request: NextRequest) {
  // 仅允许本站服务器渲染使用，外部请求返回 403
  const origin = request.headers.get('origin') || ''
  const host = request.headers.get('host') || ''
  const allowed = origin.includes('ai999999.top') || host.includes('ai999999.top') || !origin
  if (!allowed) {
    return NextResponse.json({ error: 'API 已关闭外部访问' }, { status: 403 })
  }

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
  }, { headers: CORS })
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
      userId,
      tags 
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

    // 将 base64 图片上传到 R2（如果已配置）
    if (images && Array.isArray(images) && isR2Configured()) {
      const uploadedUrls: string[] = []
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (typeof img === 'string' && img.startsWith('data:image/')) {
          try {
            const parsed = parseBase64Image(img)
            if (parsed) {
              const key = `tools/${Date.now()}-${i}.${parsed.mimeType.split('/')[1]}`
              const url = await uploadImage(key, parsed.buffer, parsed.mimeType)
              uploadedUrls.push(url)
              continue
            }
          } catch (e) {
            console.error('R2上传失败:', e)
          }
        }
        uploadedUrls.push(img)
      }
      images = uploadedUrls
    }

    // 创建 shares 记录（用户提交的工具显示在工具圈）
    const share = await prisma.share.create({
      data: {
        type: 'tool',
        content: description?.trim() || shortDesc.trim(),
        images: images?.length > 0 ? JSON.stringify(images) : null,
        userId: submitterId!,
        status: toolStatus,
        tags: tags || null,
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

    // 非管理员提交工具时通知站长
    if (!isAdmin) {
      // 通知所有管理员
      prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM users WHERE role = 'ADMIN'`
        .then(admins => {
          admins.forEach(admin => {
            createNotification({
              userId: admin.id,
              type: 'system',
              title: '新工具待审核',
              content: `用户提交了工具「${name.trim()}」`,
              link: '/admin'
            }).catch(() => {})
          })
        })
        .catch(() => {})
    }

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
