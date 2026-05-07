import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ToolCard from '@/components/ToolCard'
import CategoryFilter from '@/components/CategoryFilter'
import ToolsSearchBar from '@/components/ToolsSearchBar'
import { Suspense } from 'react'
import { Terminal, Cpu, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 12

// 强制动态渲染，避免缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const category = params.category as string | undefined
  const search = params.search as string | undefined
  const source = params.source as string | undefined
  const sort = params.sort as string | undefined
  const page = parseInt(params.page as string || '1', 10)
  
  console.log('[ToolsPage] searchParams:', params)
  console.log('[ToolsPage] search:', search)

  let totalItems: number
  let tools: any[]

  // 如果有搜索词，使用 SQL 原生查询获得相关性排序
  if (search) {
    const lowerSearch = search.toLowerCase()
    const keywords = lowerSearch.split(/\s+/).filter(k => k.length > 0)
    
    // 构建关键词条件
    const keywordConditions = keywords.map(k => `
      (
        LOWER(t.name) LIKE '%${k}%'
        OR LOWER(t."shortDesc") LIKE '%${k}%'
        OR LOWER(t.tags) LIKE '%${k}%'
        OR LOWER(t.description) LIKE '%${k}%'
      )
    `).join(' AND ')
    
    // 构建分类条件
    let categoryCondition = ''
    if (category && category !== 'all') {
      categoryCondition = `AND c.slug = '${category}'`
    }
    
    // 构建开源条件
    let sourceCondition = ''
    if (source === 'opensource') {
      sourceCondition = 'AND t."isOpenSource" = true'
    } else if (source === 'closedsource') {
      sourceCondition = 'AND t."isOpenSource" = false'
    }
    
    // 获取总数
    const countResult = await prisma.$queryRawUnsafe<{count: bigint}[]>(`
      SELECT COUNT(*) as count FROM tools t
      LEFT JOIN categories c ON t."categoryId" = c.id
      WHERE t.status = 'approved'
        AND (${keywordConditions})
        ${categoryCondition}
        ${sourceCondition}
    `)
    totalItems = Number(countResult[0].count)
    
    // 分页计算
    const offset = (page - 1) * ITEMS_PER_PAGE
    
    // 相关性排序查询
    const keywordScore = keywords.map(k => `
      CASE WHEN LOWER(t.name) = '${k}' THEN 100
           WHEN LOWER(t.name) LIKE '${k}%' THEN 80
           WHEN LOWER(t.name) LIKE '%${k}%' THEN 60
           WHEN LOWER(t.tags) LIKE '%${k}%' THEN 40
           WHEN LOWER(t."shortDesc") LIKE '%${k}%' THEN 30
           WHEN LOWER(t.description) LIKE '%${k}%' THEN 20
           ELSE 0 END
    `).join(' + ')
    
    tools = await prisma.$queryRawUnsafe(`
      SELECT
        t.id, t.name, t.slug, t."shortDesc", t."logoUrl", t.stars, t."viewCount",
        t."websiteUrl", t."githubUrl", t."pricingType", t."isOpenSource", t.tags,
        (SELECT COUNT(*) FROM user_like_tools WHERE tool_id = t.id) as "likeCount",
        c.name as "categoryName", c.slug as "categorySlug",
        (${keywordScore}) as "relevanceScore"
      FROM tools t
      LEFT JOIN categories c ON t."categoryId" = c.id
      WHERE t.status = 'approved'
        AND (${keywordConditions})
        ${categoryCondition}
        ${sourceCondition}
      ORDER BY "relevanceScore" DESC, t.stars DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `)
    
    // 格式化工具数据
    tools = (tools as any[]).map(t => ({
      id: Number(t.id),
      name: t.name,
      slug: t.slug,
      shortDesc: t.shortDesc,
      logoUrl: t.logoUrl,
      stars: Number(t.stars),
      upvotes: Number(t.likeCount || 0),
      viewCount: Number(t.viewCount),
      websiteUrl: t.websiteUrl,
      githubUrl: t.githubUrl,
      pricingType: t.pricingType,
      isOpenSource: Boolean(t.isOpenSource),
      tags: t.tags,
      category: t.categoryName ? { name: t.categoryName, slug: t.categorySlug } : null
    }))
  } else {
    // 无搜索词时，使用原有的 Prisma 查询
    const where: any = { status: 'approved' }

    if (category && category !== 'all') {
      where.category = { slug: category }
    }

    if (source === 'opensource') {
      where.isOpenSource = true
    } else if (source === 'closedsource') {
      where.isOpenSource = false
    }

    let orderBy: any = { stars: 'desc' }
    if (sort === 'newest') orderBy = { createdAt: 'desc' }
    else if (sort === 'upvotes') orderBy = { upvotes: 'desc' }
    else if (sort === 'stars') orderBy = { stars: 'desc' }

    totalItems = await prisma.tool.count({ where })

    tools = await prisma.tool.findMany({
      where,
      include: { category: true },
      orderBy,
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    })

    // 获取每个工具的点赞数
    if (tools.length > 0) {
      const toolIds = tools.map(t => t.id)
      const likeCounts = await prisma.$queryRawUnsafe<Array<{tool_id: number; count: number}>>(
        `SELECT tool_id, COUNT(*)::int as count FROM user_like_tools WHERE tool_id = ANY($1) GROUP BY tool_id`,
        toolIds
      )
      const likeMap = new Map(likeCounts.map(l => [l.tool_id, l.count]))
      tools = (tools as any[]).map(t => ({
        ...t,
        upvotes: likeMap.get(t.id) || 0
      }))
    }
  }

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  // 获取所有分类
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' }
  })

  // 构建分页链接 helper
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (source) params.set('source', source)
    if (search) params.set('search', search)
    if (sort) params.set('sort', sort)
    params.set('page', String(p))
    return `/tools?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />

      {/* Header */}
      <div className="bg-cyber-card border-b border-cyber-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-8 h-8 text-neon-green" />
            <h1 className="text-3xl font-orbitron font-black text-cyber-foreground uppercase tracking-wider">
              AI工具库
            </h1>
          </div>
          <p className="text-cyber-muted-foreground font-mono">
            <span className="text-neon-green">{'>'}</span> 发现和探索全球最新的AI工具
          </p>

          {/* Search Bar */}
          <div className="mt-6">
            <Suspense>
              <ToolsSearchBar />
            </Suspense>
          </div>
        </div>
      </div>

      <CategoryFilter categories={categories} />

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-cyber-muted-foreground font-mono">
            {search ? (
              <>
                <span className="text-neon-cyan">搜索</span> "<strong className="text-cyber-foreground">{search}</strong>" 
                <span className="text-neon-green">找到 {totalItems} 个工具</span>
              </>
            ) : (
              <>
                <span className="text-neon-green">{'>'}</span> 共 <strong className="text-cyber-foreground">{totalItems}</strong> 个工具
              </>
            )}
          </span>
        </div>

        {tools.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center border-2 border-neon-magenta clip-chamfer">
              <Terminal className="w-10 h-10 text-neon-magenta" />
            </div>
            <h3 className="text-xl font-orbitron font-bold text-cyber-foreground mb-2 uppercase tracking-wider">
              没有找到相关工具
            </h3>
            <p className="text-cyber-muted-foreground font-mono">试试其他关键词，或浏览全部分类</p>
            <Link href="/tools" className="mt-6 inline-block btn-cyber">
              查看全部工具
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-12">
            <div className="flex gap-2 items-center flex-wrap">
              {page > 1 ? (
                <Link href={buildPageUrl(page - 1)} className="btn-cyber-outline py-2 px-4 text-xs flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Link>
              ) : (
                <button disabled className="px-4 py-2 border border-cyber-border text-cyber-muted-foreground clip-chamfer-sm opacity-50 cursor-not-allowed font-mono text-xs">
                  <ChevronLeft className="w-4 h-4 inline" />
                  上一页
                </button>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                .map((p, index, arr) => (
                  <span key={p} className="flex items-center">
                    {index > 0 && arr[index - 1] !== p - 1 && (
                      <span className="px-2 text-cyber-muted-foreground font-mono">...</span>
                    )}
                    {p === page ? (
                      <span className="px-4 py-2 bg-neon-green text-cyber-background font-mono font-bold clip-chamfer-sm text-sm">
                        {p}
                      </span>
                    ) : (
                      <Link href={buildPageUrl(p)} className="px-4 py-2 border border-cyber-border text-cyber-foreground hover:border-neon-green hover:text-neon-green clip-chamfer-sm transition-colors font-mono text-sm">
                        {p}
                      </Link>
                    )}
                  </span>
                ))}

              {page < totalPages ? (
                <Link href={buildPageUrl(page + 1)} className="btn-cyber-outline py-2 px-4 text-xs flex items-center gap-1">
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <button disabled className="px-4 py-2 border border-cyber-border text-cyber-muted-foreground clip-chamfer-sm opacity-50 cursor-not-allowed font-mono text-xs">
                  下一页
                  <ChevronRight className="w-4 h-4 inline" />
                </button>
              )}

              <span className="ml-4 text-sm text-cyber-muted-foreground font-mono">
                第 {page} / {totalPages} 页
              </span>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
