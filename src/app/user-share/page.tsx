import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import UserShareCard from '@/components/UserShareCard'
import SharePageClient from './SharePageClient'
import LiveShareStats from './LiveShareStats'
import SiteAnnouncement from '@/components/SiteAnnouncement'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SignInCard from '@/components/SignInCard'
import { 
  TrendingUp, 
  Clock, 
  Search, 
  Heart, 
  Wrench, 
  Sparkles,
  MessageCircle,
  Users,
  Flame,
  ArrowUpRight,
  Terminal,
  Radio,
  Cpu,
  Code,
  HelpCircle
} from 'lucide-react'
import { getShareImages } from '@/lib/share-image'

export const metadata: Metadata = {
  title: '社区分享 | AI Hub',
  description: 'AI工具用户社区，分享你的AI工具使用心得、技巧和经验，与AI爱好者交流互动。',
}

export const revalidate = 14400

interface UserSharePageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

async function getToolShares(sort?: string, search?: string, page: number = 1) {
  const skip = (page - 1) * 24
  // 构建基础查询条件
  const whereConditions: any = {
    status: 'approved',
    type: 'tool'
  }

  // 如果有搜索关键词，添加搜索条件
  if (search) {
    const searchLower = search.toLowerCase()
    whereConditions.OR = [
      { content: { contains: searchLower, mode: 'insensitive' } },
      { user: { username: { contains: searchLower, mode: 'insensitive' } } },
      { submitToolName: { contains: searchLower, mode: 'insensitive' } },
      { tool: { name: { contains: searchLower, mode: 'insensitive' } } },
      { tags: { contains: searchLower, mode: 'insensitive' } }
    ]
  }

  // 使用 Prisma ORM 查询代替原始 SQL
  const shares = await prisma.share.findMany({
    where: whereConditions,
    include: {
      user: {
        select: {
          username: true,
          avatarUrl: true,
          role: true
        }
      },
      tool: {
        include: {
          category: {
            select: {
              name: true,
              slug: true
            }
          }
        }
      },
      comments: {
        where: {
          status: 'approved'
        },
        select: {
          id: true
        }
      }
    },
    orderBy: [{ user: { role: 'desc' } }, sort === 'hot' || sort === 'mostLiked'
      ? { likes: 'desc' }
      : { createdAt: 'desc' }],
    skip,
    take: 24
  })

  // 转换格式以兼容原有代码
  const now = new Date()
  return shares
    .map((s: any) => ({
      id: s.id,
      content: s.content,
      images: JSON.stringify(getShareImages(s.id, s.images)),
      video: s.video,
      likes: s.likes,
      viewCount: s.viewCount || 0,
      status: s.status,
      type: s.type,
      tags: s.tags,
      createdAt: s.createdAt,
      userId: s.userId,
      toolId: s.toolId,
      pinnedUntil: s.pinnedUntil,
      submitToolName: s.submitToolName,
      submitToolWebsite: s.submitToolWebsite,
      submitToolDesc: s.submitToolDesc,
      submitToolCategory: s.submitToolCategory,
      submitToolPricing: s.submitToolPricing,
      submitToolGithub: s.submitToolGithub,
      submitToolLogo: s.submitToolLogo,
      userName: s.user?.username,
      userAvatarUrl: s.user?.avatarUrl,
      userRole: s.user?.role,
      toolName: s.tool?.name,
      toolSlug: s.tool?.slug,
      toolShortDesc: s.tool?.shortDesc,
      toolDescription: s.tool?.description,
      toolWebsiteUrl: s.tool?.websiteUrl,
      toolLogoUrl: s.tool?.logoUrl,
      toolTags: s.tool?.tags,
      toolViewCount: s.tool?.viewCount || 0,
      categoryName: s.tool?.category?.name,
      categorySlug: s.tool?.category?.slug,
      commentsCount: s.comments?.length || 0
    }))
    .sort((a, b) => {
      // 置顶中（未过期）的排最前
      const aPinned = a.pinnedUntil && new Date(a.pinnedUntil) > now ? 1 : 0
      const bPinned = b.pinnedUntil && new Date(b.pinnedUntil) > now ? 1 : 0
      return bPinned - aPinned
    })
}

async function getLifeShares(sort?: string, search?: string, page: number = 1) {
  const skip = (page - 1) * 24

  // 构建基础查询条件
  const whereConditions: any = {
    status: 'approved',
    type: 'life'
  }

  // 如果有搜索关键词，添加搜索条件
  if (search) {
    const searchLower = search.toLowerCase()
    whereConditions.OR = [
      { content: { contains: searchLower, mode: 'insensitive' } },
      { user: { username: { contains: searchLower, mode: 'insensitive' } } },
      { tags: { contains: searchLower, mode: 'insensitive' } }
    ]
  }

  // 使用 Prisma ORM 查询代替原始 SQL
  const shares = await prisma.share.findMany({
    where: whereConditions,
    include: {
      user: {
        select: {
          username: true,
          avatarUrl: true,
          role: true
        }
      },
      comments: {
        where: {
          status: 'approved'
        },
        select: {
          id: true
        }
      }
    },
    orderBy: [{ user: { role: 'desc' } }, sort === 'hot' || sort === 'mostLiked'
      ? { likes: 'desc' }
      : { createdAt: 'desc' }],
    skip,
    take: 24
  })

  // 转换格式以兼容原有代码
  const now = new Date()
  return shares
    .map((s: any) => ({
      id: s.id,
      content: s.content,
      images: JSON.stringify(getShareImages(s.id, s.images)),
      video: s.video,
      likes: s.likes,
      viewCount: s.viewCount || 0,
      status: s.status,
      type: s.type,
      tags: s.tags,
      createdAt: s.createdAt,
      userId: s.userId,
      pinnedUntil: s.pinnedUntil,
      userName: s.user?.username,
      userAvatarUrl: s.user?.avatarUrl,
      userRole: s.user?.role,
      commentsCount: s.comments?.length || 0
    }))
    .sort((a, b) => {
      const aPinned = a.pinnedUntil && new Date(a.pinnedUntil) > now ? 1 : 0
      const bPinned = b.pinnedUntil && new Date(b.pinnedUntil) > now ? 1 : 0
      return bPinned - aPinned
    })
}

async function getTechShares(sort?: string, search?: string, page: number = 1) {
  const skip = (page - 1) * 24
  const whereConditions: any = {
    status: 'approved',
    type: 'tech_share'
  }

  if (search) {
    const searchLower = search.toLowerCase()
    whereConditions.OR = [
      { content: { contains: searchLower, mode: 'insensitive' } },
      { user: { username: { contains: searchLower, mode: 'insensitive' } } },
      { tags: { contains: searchLower, mode: 'insensitive' } }
    ]
  }

  const shares = await prisma.share.findMany({
    where: whereConditions,
    include: {
      user: {
        select: { username: true, avatarUrl: true, role: true }
      },
      comments: {
        where: { status: 'approved' },
        select: { id: true }
      }
    },
    orderBy: [{ user: { role: 'desc' } }, sort === 'hot' || sort === 'mostLiked'
      ? { likes: 'desc' }
      : { createdAt: 'desc' }],
    skip,
    take: 24
  })

  const now = new Date()
  return shares
    .map((s: any) => ({
      id: s.id,
      content: s.content,
      images: JSON.stringify(getShareImages(s.id, s.images)),
      video: s.video,
      likes: s.likes,
      viewCount: s.viewCount || 0,
      status: s.status,
      type: s.type,
      tags: s.tags,
      createdAt: s.createdAt,
      userId: s.userId,
      pinnedUntil: s.pinnedUntil,
      userName: s.user?.username,
      userAvatarUrl: s.user?.avatarUrl,
      userRole: s.user?.role,
      commentsCount: s.comments?.length || 0
    }))
    .sort((a, b) => {
      const aPinned = a.pinnedUntil && new Date(a.pinnedUntil) > now ? 1 : 0
      const bPinned = b.pinnedUntil && new Date(b.pinnedUntil) > now ? 1 : 0
      return bPinned - aPinned
    })
}

async function getQaHelpShares(sort?: string, search?: string, page: number = 1) {
  const skip = (page - 1) * 24
  const whereConditions: any = {
    status: 'approved',
    type: 'qa_help'
  }

  if (search) {
    const searchLower = search.toLowerCase()
    whereConditions.OR = [
      { content: { contains: searchLower, mode: 'insensitive' } },
      { user: { username: { contains: searchLower, mode: 'insensitive' } } },
      { tags: { contains: searchLower, mode: 'insensitive' } }
    ]
  }

  const shares = await prisma.share.findMany({
    where: whereConditions,
    include: {
      user: {
        select: { username: true, avatarUrl: true, role: true }
      },
      comments: {
        where: { status: 'approved' },
        select: { id: true }
      }
    },
    orderBy: [{ user: { role: 'desc' } }, sort === 'hot' || sort === 'mostLiked'
      ? { likes: 'desc' }
      : { createdAt: 'desc' }],
    skip,
    take: 24
  })

  const now = new Date()
  return shares
    .map((s: any) => ({
      id: s.id,
      content: s.content,
      images: JSON.stringify(getShareImages(s.id, s.images)),
      video: s.video,
      likes: s.likes,
      viewCount: s.viewCount || 0,
      status: s.status,
      type: s.type,
      tags: s.tags,
      createdAt: s.createdAt,
      userId: s.userId,
      pinnedUntil: s.pinnedUntil,
      userName: s.user?.username,
      userAvatarUrl: s.user?.avatarUrl,
      userRole: s.user?.role,
      commentsCount: s.comments?.length || 0
    }))
    .sort((a, b) => {
      const aPinned = a.pinnedUntil && new Date(a.pinnedUntil) > now ? 1 : 0
      const bPinned = b.pinnedUntil && new Date(b.pinnedUntil) > now ? 1 : 0
      return bPinned - aPinned
    })
}

async function getStats() {
  const [toolCount, lifeCount, techCount, qaCount, totalLikes, totalComments] = await Promise.all([
    prisma.share.count({ where: { type: 'tool', status: 'approved' } }),
    prisma.share.count({ where: { type: 'life', status: 'approved' } }),
    prisma.share.count({ where: { type: 'tech_share', status: 'approved' } }),
    prisma.share.count({ where: { type: 'qa_help', status: 'approved' } }),
    prisma.share.aggregate({ _sum: { likes: true }, where: { status: 'approved' } }),
    prisma.shareComment.count({ where: { status: 'approved' } })
  ])

  return {
    toolCount,
    lifeCount,
    techCount,
    qaCount,
    totalLikes: totalLikes._sum.likes || 0,
    totalComments
  }
}

// 获取热门话题标签
async function getPopularTags() {
  // 先用原始 SQL 取回 tags 列，再在 JS 里拆解，避免 unnest 在 Prisma 中的兼容问题
  try {
    const rows = await prisma.$queryRaw<Array<{ tags: string | null }>>`
      SELECT tags FROM shares
      WHERE tags IS NOT NULL AND tags != '' AND status = 'approved'
    `
    // 在 JS 里拆解 tags、统计词频
    const freq = new Map<string, number>()
    for (const row of rows) {
      if (!row.tags) continue
      row.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
        freq.set(tag, (freq.get(tag) || 0) + 1)
      })
    }
    const sorted = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
    // 如果数据库有标签就返回真实数据，没有就返回空数组
    return sorted
  } catch (error) {
    console.error('获取热门标签失败:', error)
    return []
  }
}

export default async function UserSharePage({ searchParams }: UserSharePageProps) {
  const sort = searchParams.sort as string | undefined
  const search = searchParams.search as string | undefined
  const tab = searchParams.tab as string | undefined || 'tool'
  const page = Math.max(1, parseInt(searchParams.page as string) || 1)
  
  // 鉴权：验证是否已登录（未登录则显示登录提示）
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  let isLoggedIn = false
  if (token) {
    try {
      const userResult = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT id FROM users WHERE "sessionToken" = $1`,
        token
      )
      isLoggedIn = Array.isArray(userResult) && userResult.length > 0
    } catch {}
  }
  
  if (!isLoggedIn) {
    return <LoginPrompt />
  }
  
  let toolShares: any[] = [], lifeShares: any[] = [], techShares: any[] = [], qaShares: any[] = [], stats: any = { toolCount: 0, lifeCount: 0, techCount: 0, qaCount: 0, totalLikes: 0, totalComments: 0 }, popularTags: any[] = []
  try {
    const results = await Promise.all([
      getToolShares(sort, search, page),
      getLifeShares(sort, search, page),
      getTechShares(sort, search, page),
      getQaHelpShares(sort, search, page),
      getStats(),
      getPopularTags(),
    ])
    toolShares = results[0]
    lifeShares = results[1]
    techShares = results[2]
    qaShares = results[3]
    stats = results[4]
    popularTags = results[5]
  } catch (error) {
    console.error('加载分享数据失败（可能是数据库超限）:', error)
    // 静默失败，页面用空数据渲染
  }

  // 搜索时自动跳转到有结果的圈子
  if (search) {
    const allShares: Record<string, any[]> = { tool: toolShares, life: lifeShares, tech: techShares, qa: qaShares }
    if (allShares[tab]?.length === 0) {
      const firstNonEmpty = Object.entries(allShares).find(([, shares]) => shares.length > 0)
      if (firstNonEmpty) {
        redirect(`/user-share?tab=${firstNonEmpty[0]}&search=${encodeURIComponent(search)}`)
      }
    }
  }

  const shareMap: Record<string, any[]> = { tool: toolShares, life: lifeShares, tech: techShares, qa: qaShares }
  const currentShares = shareMap[tab] || toolShares
  const totalCount = stats[`${tab}Count`] || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / 24))

  function buildPageUrl(p: number) {
    const params = new URLSearchParams()
    if (tab) params.set('tab', tab)
    if (p > 1) params.set('page', String(p))
    if (sort) params.set('sort', sort)
    if (search) params.set('search', search)
    return `/user-share?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-neon-green/5 via-transparent to-neon-magenta/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-magenta/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          {/* 标题区域 */}
          <div className="text-center mb-10">
            <div className="inline-flex shadow-neon mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 border border-neon-green/50 bg-neon-green/5 clip-chamfer-sm">
                <Radio className="w-4 h-4 text-neon-green animate-pulse" />
                <span className="text-sm font-mono text-neon-green uppercase tracking-wider">
                  {stats.toolCount + stats.lifeCount + stats.techCount + stats.qaCount} 条分享 · {stats.totalLikes} 次点赞 · {stats.totalComments} 条评论
                </span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-orbitron font-black text-cyber-foreground mb-3 tracking-tight uppercase">
              发现与<span className="text-neon-green">分享</span>
            </h1>
            <p className="text-lg text-cyber-muted-foreground max-w-2xl mx-auto font-mono">
              <span className="text-neon-green">{'>'}</span> 探索社区精选的 AI 工具，分享你的生活点滴
            </p>
          </div>

          {/* 统计卡片 */}
                <LiveShareStats initialStats={stats} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* 主布局：左侧广告 + 中间内容 + 右侧边栏 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧推广 - 简洁卡片 */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24 space-y-3">
              <a
                href="https://sim.pst1.top"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#12121a] border border-[#2a2a3a] hover:border-neon-cyan/50 transition-colors p-4"
                style={{clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'}}
              >
                <div className="text-xs text-neon-cyan/70 font-mono mb-2">推广</div>
                <div className="text-sm font-bold text-cyber-foreground mb-1">Sim帕沙特商城</div>
                <div className="text-xs text-cyber-muted-foreground font-mono leading-relaxed mb-3">
                  gg卡 · haha卡 · Lucky2 Sim
                </div>
                <div className="flex items-center gap-1 text-xs text-neon-cyan font-mono">
                  前往选购 <span className="inline-block">→</span>
                </div>
              </a>

              <a
                href="https://my.dnshe.com/go.php?code=mnieBD6dxF"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#12121a] border border-[#2a2a3a] hover:border-neon-cyan/50 transition-colors p-4"
                style={{clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'}}
              >
                <div className="text-xs text-neon-cyan/70 font-mono mb-2">推广</div>
                <div className="text-sm font-bold text-cyber-foreground mb-1">DNSHE 免费域名</div>
                <div className="text-xs text-cyber-muted-foreground font-mono leading-relaxed mb-3">
                  注册免费领3个免费域名
                </div>
                <div className="flex items-center gap-1 text-xs text-neon-cyan font-mono">
                  立即注册 <span className="inline-block">→</span>
                </div>
              </a>

              <a
                href="https://hero-sms.com/?ref=1256299"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#12121a] border border-[#2a2a3a] hover:border-neon-cyan/50 transition-colors p-4"
                style={{clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'}}
              >
                <div className="text-xs text-neon-cyan/70 font-mono mb-2">推广</div>
                <div className="text-sm font-bold text-cyber-foreground mb-1">HeroSMS</div>
                <div className="text-xs text-cyber-muted-foreground font-mono leading-relaxed mb-3">
                  虚拟号码接码 · 注册海外服务必备
                </div>
                <div className="flex items-center gap-1 text-xs text-neon-cyan font-mono">
                  立即体验 <span className="inline-block">→</span>
                </div>
              </a>

              <a
                href="https://bewild.ai?code=9JY5HSYX"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#12121a] border border-[#2a2a3a] hover:border-neon-cyan/50 transition-colors p-4"
                style={{clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'}}
              >
                <div className="text-xs text-neon-cyan/70 font-mono mb-2">推广</div>
                <div className="text-sm font-bold text-cyber-foreground mb-1">海外AI充值平台</div>
                <div className="text-xs text-cyber-muted-foreground font-mono leading-relaxed mb-3">
                  ChatGPT/Claude 代充值 · 快捷稳定
                </div>
                <div className="flex items-center gap-1 text-xs text-neon-cyan font-mono">
                  立即体验 <span className="inline-block">→</span>
                </div>
              </a>
            </div>
          </div>

          {/* 左侧主要内容 */}
          <div className="flex-1 min-w-0">
            {/* Tab 切换 */}
            <div className="bg-cyber-card border border-cyber-border clip-chamfer p-2 mb-6">
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                <Link 
                  href={`/user-share?tab=tool${sort ? `&sort=${sort}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={`flex-shrink-0 md:flex-1 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all duration-300 ${
                    tab === 'tool' 
                      ? 'bg-neon-green text-cyber-background shadow-neon font-bold' 
                      : 'text-cyber-muted-foreground hover:text-neon-green hover:bg-neon-green/10'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  工具圈
                  <span className={`ml-1 px-2 py-0.5 clip-chamfer-sm text-xs ${tab === 'tool' ? 'bg-cyber-background/20' : 'bg-cyber-muted'}`}>
                    {stats.toolCount}
                  </span>
                </Link>
                <Link 
                  href={`/user-share?tab=life${sort ? `&sort=${sort}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={`flex-shrink-0 md:flex-1 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all duration-300 ${
                    tab === 'life' 
                      ? 'bg-neon-cyan text-cyber-background shadow-neon-tertiary font-bold' 
                      : 'text-cyber-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  生活圈
                  <span className={`ml-1 px-2 py-0.5 clip-chamfer-sm text-xs ${tab === 'life' ? 'bg-cyber-background/20' : 'bg-cyber-muted'}`}>
                    {stats.lifeCount}
                  </span>
                </Link>
                <Link 
                  href={`/user-share?tab=tech${sort ? `&sort=${sort}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={`flex-shrink-0 md:flex-1 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all duration-300 ${
                    tab === 'tech' 
                      ? 'bg-neon-green/80 text-cyber-background shadow-neon font-bold' 
                      : 'text-cyber-muted-foreground hover:text-neon-green hover:bg-neon-green/10'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  技术分享
                  <span className={`ml-1 px-2 py-0.5 clip-chamfer-sm text-xs ${tab === 'tech' ? 'bg-cyber-background/20' : 'bg-cyber-muted'}`}>
                    {stats.techCount}
                  </span>
                </Link>
                <Link 
                  href={`/user-share?tab=qa${sort ? `&sort=${sort}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={`flex-shrink-0 md:flex-1 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all duration-300 ${
                    tab === 'qa' 
                      ? 'bg-neon-magenta/80 text-cyber-background shadow-neon-secondary font-bold' 
                      : 'text-cyber-muted-foreground hover:text-neon-magenta hover:bg-neon-magenta/10'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  问答求助
                  <span className={`ml-1 px-2 py-0.5 clip-chamfer-sm text-xs ${tab === 'qa' ? 'bg-cyber-background/20' : 'bg-cyber-muted'}`}>
                    {stats.qaCount}
                  </span>
                </Link>
              </div>
            </div>

            {/* 搜索和排序工具栏 */}
            <div className="bg-cyber-card border border-cyber-border clip-chamfer p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* 搜索框 */}
                <form className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-green" />
                  <input
                    type="text"
                    name="search"
                    defaultValue={search || ''}
                    placeholder={tab === 'tool' ? '搜索工具、体验分享...' : tab === 'tech' ? '搜索技术问题...' : tab === 'qa' ? '搜索问答...' : '搜索生活动态...'}
                    className="input-cyber w-full"
                  />
                  {search && (
                    <Link 
                      href={`/user-share?tab=${tab}`} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center clip-chamfer-sm bg-cyber-muted text-cyber-muted-foreground hover:bg-neon-green hover:text-cyber-background transition-colors"
                    >
                      ×
                    </Link>
                  )}
                </form>
                
                {/* 排序选项 */}
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/user-share?tab=${tab}${search ? `&search=${encodeURIComponent(search)}` : ''}`} 
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-mono uppercase tracking-wider transition-all rounded-lg ${
                      !sort 
                        ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' 
                        : 'text-cyber-muted-foreground hover:text-neon-green hover:bg-neon-green/10 border border-cyber-border'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    最新
                  </Link>
                  <Link 
                    href={`/user-share?tab=${tab}&sort=hot${search ? `&search=${encodeURIComponent(search)}` : ''}`} 
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-mono uppercase tracking-wider transition-all rounded-lg ${
                      sort === 'hot' 
                        ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' 
                        : 'text-cyber-muted-foreground hover:text-neon-green hover:bg-neon-green/10 border border-cyber-border'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    热门
                  </Link>
                  <Link 
                    href={`/user-share?tab=${tab}&sort=mostLiked${search ? `&search=${encodeURIComponent(search)}` : ''}`} 
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-mono uppercase tracking-wider transition-all rounded-lg ${
                      sort === 'mostLiked' 
                        ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' 
                        : 'text-cyber-muted-foreground hover:text-neon-green hover:bg-neon-green/10 border border-cyber-border'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    最多赞
                  </Link>
                </div>

                {/* 发布按钮 */}
                <SharePageClient mode={tab as 'tool' | 'life' | 'tech' | 'qa'} />
              </div>
            </div>

            {/* 搜索结果提示 */}
            {search && (
              <div className="mb-6 p-4 bg-neon-green/5 border border-neon-green/30 clip-chamfer">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cyber-foreground font-mono">
                    <span className="text-neon-green">{'>'}</span> 搜索 "<span className="font-bold text-neon-green">{search}</span>" 的结果
                  </span>
                  <Link 
                    href={`/user-share?tab=${tab}`} 
                    className="text-sm text-neon-green hover:text-neon-cyan font-medium flex items-center gap-1 font-mono"
                  >
                    清除搜索
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* 网站公告轮播 */}
            <div className="mb-6">
              <SiteAnnouncement />
            </div>

            {/* 内容列表 */}
            {currentShares.length === 0 ? (
              <div className="text-center py-16 bg-cyber-card border border-cyber-border clip-chamfer">
                <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center border-2 border-neon-magenta clip-chamfer">
                  {tab === 'tool' ? (
                    <Wrench className="w-10 h-10 text-neon-magenta" />
                  ) : tab === 'tech' ? (
                    <Code className="w-10 h-10 text-neon-magenta" />
                  ) : tab === 'qa' ? (
                    <HelpCircle className="w-10 h-10 text-neon-magenta" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-neon-magenta" />
                  )}
                </div>
                <p className="text-cyber-foreground text-lg mb-2 font-orbitron">
                  {search ? '没有找到相关内容' : `还没有${tab === 'tool' ? '工具分享' : tab === 'tech' ? '技术分享' : tab === 'qa' ? '问答' : '生活动态'}`}
                </p>
                {!search && (
                  <p className="text-sm text-cyber-muted-foreground font-mono">
                    点击右上角按钮，成为第一个分享的人
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {tab === 'tool' ? (
                  toolShares.map((share: any) => {
                    const isUserSubmitted = !share.toolId && share.submitToolName
                    const toolData = isUserSubmitted ? {
                      id: null,
                      name: share.submitToolName,
                      slug: null,
                      shortDesc: share.submitToolDesc,
                      description: share.content,
                      websiteUrl: share.submitToolWebsite,
                      githubUrl: share.submitToolGithub,
                      logoUrl: share.submitToolLogo,
                      tags: null,
                      viewCount: 0,
                      category: share.submitToolCategory ? { name: share.submitToolCategory, slug: '' } : null
                    } : {
                      id: share.toolId,
                      name: share.toolName,
                      slug: share.toolSlug,
                      shortDesc: share.toolShortDesc,
                      description: share.toolDescription,
                      websiteUrl: share.toolWebsiteUrl,
                      githubUrl: null,
                      logoUrl: share.toolLogoUrl,
                      tags: share.toolTags,
                      viewCount: share.toolViewCount || 0,
                      category: share.categoryName ? { name: share.categoryName, slug: share.categorySlug } : null
                    }
                    
                    return (
                      <UserShareCard key={share.id} share={{
                        id: share.id,
                        content: share.content,
                        images: share.images,
                        video: share.video,
                        likes: share.likes,
                        viewCount: share.viewCount || 0,
                        status: share.status,
                        type: share.type,
                        tags: share.tags,
                        createdAt: share.createdAt,
                        pinnedUntil: share.pinnedUntil,
                        user: { id: share.userId, username: share.userName, avatarUrl: share.userAvatarUrl, role: share.userRole },
                        tool: toolData,
                        _count: { comments: Number(share.commentsCount || 0) }
                      }} />
                    )
                  })
                ) : (tab === 'tech' ? techShares : tab === 'qa' ? qaShares : lifeShares).map((share: any) => (
                  <UserShareCard key={share.id} share={{
                    id: share.id,
                    content: share.content,
                    images: share.images,
                    video: share.video,
                    likes: share.likes,
                    viewCount: share.viewCount || 0,
                    status: share.status,
                    type: share.type,
                    tags: share.tags,
                    createdAt: share.createdAt,
                    user: { id: share.userId, username: share.userName, avatarUrl: share.userAvatarUrl, role: share.userRole },
                    tool: null,
                    _count: { comments: Number(share.commentsCount || 0) }
                  }} />
                ))}
              </div>
            )}
            
            {currentShares.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-8">
                {/* 上一页 */}
                {page > 1 ? (
                  <Link
                    href={buildPageUrl(page - 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-cyber-card border border-cyber-border hover:border-neon-cyan text-cyber-foreground font-mono text-sm clip-chamfer-sm hover:bg-neon-cyan/5 transition-all duration-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-2 bg-cyber-card/50 border border-cyber-border/30 text-cyber-muted-foreground/50 font-mono text-sm clip-chamfer-sm cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </span>
                )}

                {/* 页码 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    // 显示第一页、最后一页、当前页附近
                    if (p === 1 || p === totalPages) return true
                    if (Math.abs(p - page) <= 1) return true
                    return false
                  })
                  .map((p, idx, arr) => (
                    <span key={p} className="inline-flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-2 text-cyber-muted-foreground font-mono text-sm">...</span>
                      )}
                      {p === page ? (
                        <span className="inline-flex items-center justify-center w-9 h-9 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan font-mono text-sm clip-chamfer-sm font-bold">
                          {p}
                        </span>
                      ) : (
                        <Link
                          href={buildPageUrl(p)}
                          className="inline-flex items-center justify-center w-9 h-9 bg-cyber-card border border-cyber-border hover:border-neon-cyan text-cyber-foreground font-mono text-sm clip-chamfer-sm hover:bg-neon-cyan/5 transition-all duration-200"
                        >
                          {p}
                        </Link>
                      )}
                    </span>
                  ))}

                {/* 下一页 */}
                {page < totalPages ? (
                  <Link
                    href={buildPageUrl(page + 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-cyber-card border border-cyber-border hover:border-neon-cyan text-cyber-foreground font-mono text-sm clip-chamfer-sm hover:bg-neon-cyan/5 transition-all duration-200"
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-2 bg-cyber-card/50 border border-cyber-border/30 text-cyber-muted-foreground/50 font-mono text-sm clip-chamfer-sm cursor-not-allowed">
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 右侧边栏 */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            {/* 快速操作卡片 */}
            <div className="bg-cyber-card border border-cyber-border clip-chamfer p-6">
              <h3 className="font-orbitron font-bold text-cyber-foreground mb-4 uppercase tracking-wider text-sm">
                <span className="text-neon-green">{'>'}</span> 快速开始
              </h3>
              <div className="space-y-3">
                <Link 
                  href="/user-share?tab=tool"
                  className="flex items-center gap-3 p-3 clip-chamfer-sm border border-neon-green/30 bg-neon-green/5 hover:bg-neon-green/10 hover:border-neon-green transition-colors group"
                >
                  <div className="w-10 h-10 flex items-center justify-center clip-chamfer-sm bg-neon-green text-cyber-background group-hover:shadow-neon transition-shadow">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-cyber-foreground font-mono">分享工具</div>
                    <div className="text-xs text-cyber-muted-foreground font-mono">推荐好用的 AI 工具</div>
                  </div>
                </Link>
                <Link 
                  href="/user-share?tab=life"
                  className="flex items-center gap-3 p-3 clip-chamfer-sm border border-neon-cyan/30 bg-neon-cyan/5 hover:bg-neon-cyan/10 hover:border-neon-cyan transition-colors group"
                >
                  <div className="w-10 h-10 flex items-center justify-center clip-chamfer-sm bg-neon-cyan text-cyber-background group-hover:shadow-neon-tertiary transition-shadow">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-cyber-foreground font-mono">发布动态</div>
                    <div className="text-xs text-cyber-muted-foreground font-mono">分享你的生活点滴</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* 热门话题 */}
            <div className="bg-cyber-card border border-cyber-border clip-chamfer p-6">
              <h3 className="font-orbitron font-bold text-cyber-foreground mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-neon-green" />
                热门话题
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.length > 0 ? (
                  popularTags.map((tag) => (
                    <Link
                      key={tag.name}
                      href={`/user-share?search=${encodeURIComponent(tag.name)}`}
                      className="px-3 py-1.5 border border-cyber-border text-sm text-cyber-muted-foreground hover:border-neon-green hover:text-neon-green clip-chamfer-sm transition-colors font-mono"
                    >
                      #{tag.name}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-[#4b5563] font-mono">暂无热门话题，发布动态时添加标签即可出现</span>
                )}
              </div>
            </div>

            {/* 签到等级卡片 */}
            <SignInCard />

            {/* 社区规则 */}
            <div className="bg-cyber-card border border-cyber-border clip-chamfer p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-transparent" />
              <h3 className="font-orbitron font-bold text-cyber-foreground mb-3 uppercase tracking-wider text-sm relative">
                <span className="text-neon-green">{'>'}</span> 社区公约
              </h3>
              <ul className="space-y-2 text-sm text-cyber-muted-foreground font-mono relative">
                <li className="flex items-start gap-2">
                  <span className="text-neon-green">01.</span>
                  分享真实、有价值的内容
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-green">02.</span>
                  尊重他人，友善交流
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-green">03.</span>
                  禁止发布垃圾信息和广告
                </li>
              </ul>
            </div>

            {/* QQ交流群 */}
            <div className="bg-cyber-card border border-cyber-border clip-chamfer p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent" />
              <h3 className="font-orbitron font-bold text-cyber-foreground mb-4 uppercase tracking-wider text-sm relative flex items-center gap-2">
                <Users className="w-4 h-4 text-neon-cyan" />
                加入交流群
              </h3>
              <div className="relative">
                <img 
                  src="/images/qq-group.jpg" 
                  alt="QQ交流群二维码"
                  className="w-full rounded-lg border border-cyber-border"
                />
                <p className="text-center mt-3 font-mono">
                  <span className="text-xs text-cyber-muted-foreground">群号 </span>
                  <span className="text-sm text-neon-cyan font-bold">646576998</span>
                </p>
                <p className="text-xs text-cyber-muted-foreground font-mono mt-1 text-center">
                  扫码或搜索群号加入
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

// 未登录时显示的登录提示页（高级版）
function LoginPrompt() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col relative overflow-hidden">
      {/* ===== 背景装饰层 ===== */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 网格线 */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(0,212,255,0.4) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(0,212,255,0.4) 1px, transparent 1px)'
            ].join(', '),
            backgroundSize: '60px 60px'
          }}
        />
        {/* 青色光晕 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)' }}
        />
        {/* 洋红光晕 */}
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,0,255,0.05) 0%, transparent 70%)' }}
        />
        {/* 顶部斜切装饰线 */}
        <div className="absolute top-0 right-0 w-72 h-72 border-r-2 border-t-2 border-neon-cyan/15"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />
        {/* 底部斜切装饰线 */}
        <div className="absolute bottom-0 left-0 w-56 h-56 border-l-2 border-b-2 border-neon-magenta/15"
          style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}
        />
        {/* 浮动粒子点 */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: i % 2 === 0 ? 'rgba(0,212,255,0.4)' : 'rgba(255,0,255,0.3)',
              top: `${15 + (i * 7) % 70}%`,
              left: `${10 + (i * 11) % 80}%`,
              animation: `ping ${2 + (i % 3) * 1.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>

      <Navbar />
      
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="max-w-md w-full">
          {/* ===== 锁图标区域 ===== */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* 脉冲环 1 */}
            <div className="absolute inset-0 rounded-full border-2 border-neon-cyan/20 animate-ping" style={{ animationDuration: '3s' }} />
            {/* 脉冲环 2 */}
            <div className="absolute inset-3 rounded-full border border-neon-cyan/15" />
            {/* 核心图标容器 */}
            <div className="absolute inset-4 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,212,255,0.03))',
                border: '1px solid rgba(0,212,255,0.3)',
                clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              <svg className="w-14 h-14 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>
          
          {/* ===== 文字内容 ===== */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 border border-neon-cyan/30 bg-neon-cyan/5"
              style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-xs font-mono text-neon-cyan/80 uppercase tracking-widest">会员专属</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-orbitron font-black text-[#e0e0e0] mb-4 tracking-tight">
              登录后<span className="text-neon-cyan">解锁</span>
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent mx-auto mb-5" />
            <p className="text-[#6b7280] font-mono text-sm leading-relaxed max-w-xs mx-auto">
              社区分享内容仅对登录用户开放。
              <br />
              立即注册，发现更多精彩。
            </p>
          </div>

          {/* ===== 按钮组 ===== */}
          <div className="space-y-3 max-w-xs mx-auto">
            <Link
              href="/login?redirect=/user-share"
              className="group relative block w-full py-3.5 overflow-hidden"
              style={{
                clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))',
                background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))',
                border: '1px solid rgba(0,212,255,0.4)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative font-mono text-sm uppercase tracking-[0.2em] text-neon-cyan group-hover:text-white transition-colors duration-300">
                登录 / 注册
              </span>
            </Link>
            
            <Link
              href="/"
              className="group block w-full py-3 text-center font-mono text-xs uppercase tracking-[0.15em] text-[#4b5563] hover:text-neon-green transition-colors duration-200"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                返回首页
              </span>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
