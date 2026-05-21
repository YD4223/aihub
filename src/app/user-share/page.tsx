import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import UserShareCard from '@/components/UserShareCard'
import SharePageClient from './SharePageClient'
import LiveShareStats from './LiveShareStats'
import SiteAnnouncement from '@/components/SiteAnnouncement'
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
  Cpu
} from 'lucide-react'
import { getShareImages } from '@/lib/share-image'

export const metadata: Metadata = {
  title: '社区分享 | AI Hub',
  description: 'AI工具用户社区，分享你的AI工具使用心得、技巧和经验，与AI爱好者交流互动。',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface UserSharePageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

async function getToolShares(sort?: string, search?: string) {
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

async function getLifeShares(sort?: string, search?: string) {
  const orderBy = sort === 'hot' || sort === 'mostLiked' 
    ? 's.likes DESC, s.createdAt DESC' 
    : 's.createdAt DESC'

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

async function getStats() {
  const [toolCount, lifeCount, totalLikes, totalComments] = await Promise.all([
    prisma.share.count({ where: { type: 'tool', status: 'approved' } }),
    prisma.share.count({ where: { type: 'life', status: 'approved' } }),
    prisma.share.aggregate({ _sum: { likes: true }, where: { status: 'approved' } }),
    prisma.shareComment.count({ where: { status: 'approved' } })
  ])

  return {
    toolCount,
    lifeCount,
    totalLikes: totalLikes._sum.likes || 0,
    totalComments
  }
}

// 获取热门话题标签
async function getPopularTags() {
  try {
    const tags = await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
      SELECT 
        TRIM(unnest(string_to_array(s.tags, ','))) as tag,
        COUNT(*) as count
      FROM shares s
      WHERE s.tags IS NOT NULL AND s.tags != '' AND s.status = 'approved'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `
    return tags.map(t => ({ name: t.tag, count: Number(t.count) }))
  } catch (error) {
    console.error('获取热门标签失败:', error)
    // 返回默认话题作为降级方案
    return [
      { name: 'AI工具推荐', count: 0 },
      { name: '使用心得', count: 0 },
      { name: '效率提升', count: 0 },
      { name: 'ChatGPT', count: 0 },
      { name: 'Midjourney', count: 0 },
      { name: 'Claude', count: 0 },
      { name: '编程助手', count: 0 },
      { name: '设计工具', count: 0 },
    ]
  }
}

export default async function UserSharePage({ searchParams }: UserSharePageProps) {
  const sort = searchParams.sort as string | undefined
  const search = searchParams.search as string | undefined
  const tab = searchParams.tab as string | undefined || 'tool'
  
  const [toolShares, lifeShares, stats, popularTags] = await Promise.all([
    getToolShares(sort, search),
    getLifeShares(sort, search),
    getStats(),
    getPopularTags(),
  ])

  const currentShares = tab === 'tool' ? toolShares : lifeShares

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
                  {stats.toolCount + stats.lifeCount} 条分享 · {stats.totalLikes} 次点赞 · {stats.totalComments} 条评论
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* 主布局：左侧内容 + 右侧边栏 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧主要内容 */}
          <div className="flex-1">
            {/* Tab 切换 */}
            <div className="bg-cyber-card border border-cyber-border clip-chamfer p-2 mb-6">
              <div className="flex gap-1">
                <Link 
                  href={`/user-share?tab=tool${sort ? `&sort=${sort}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all duration-300 ${
                    tab === 'tool' 
                      ? 'bg-neon-green text-cyber-background shadow-neon font-bold' 
                      : 'text-cyber-muted-foreground hover:text-neon-green hover:bg-neon-green/10'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  工具圈
                  <span className={`ml-1 px-2 py-0.5 clip-chamfer-sm text-xs ${tab === 'tool' ? 'bg-cyber-background/20' : 'bg-cyber-muted'}`}>
                    {toolShares.length}
                  </span>
                </Link>
                <Link 
                  href={`/user-share?tab=life${sort ? `&sort=${sort}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all duration-300 ${
                    tab === 'life' 
                      ? 'bg-neon-cyan text-cyber-background shadow-neon-tertiary font-bold' 
                      : 'text-cyber-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  生活圈
                  <span className={`ml-1 px-2 py-0.5 clip-chamfer-sm text-xs ${tab === 'life' ? 'bg-cyber-background/20' : 'bg-cyber-muted'}`}>
                    {lifeShares.length}
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
                    placeholder={tab === 'tool' ? '搜索工具、体验分享...' : '搜索生活动态...'}
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
                <SharePageClient mode={tab as 'tool' | 'life'} />
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
                  ) : (
                    <Sparkles className="w-10 h-10 text-neon-magenta" />
                  )}
                </div>
                <p className="text-cyber-foreground text-lg mb-2 font-orbitron">
                  {search ? '没有找到相关内容' : `还没有${tab === 'tool' ? '工具分享' : '生活动态'}`}
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
                ) : (
                  lifeShares.map((share: any) => (
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
                  ))
                )}
              </div>
            )}
            
            {currentShares.length >= 24 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-cyber-card border border-cyber-border clip-chamfer text-cyber-muted-foreground text-sm font-mono">
                  <span>已经到底了</span>
                  <span className="w-1 h-1 bg-cyber-muted-foreground rounded-full"></span>
                  <span>共 {currentShares.length} 条</span>
                </div>
              </div>
            )}
          </div>

          {/* 右侧边栏 */}
          <div className="w-full lg:w-80 space-y-6">
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
                {popularTags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/user-share?tab=${tab}&search=${encodeURIComponent(tag.name)}`}
                    className="px-3 py-1.5 border border-cyber-border text-sm text-cyber-muted-foreground hover:border-neon-green hover:text-neon-green clip-chamfer-sm transition-colors font-mono"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>

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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
