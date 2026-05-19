import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import TrendingToolCard from '@/components/TrendingToolCard'
import { TrendingUp, Flame, Clock, Star, Trophy } from 'lucide-react'

export const metadata = {
  title: 'AI工具趋势榜 | AI Hub',
  description: '查看最热门的AI工具排名，基于用户互动和热度指数实时更新，发现大家都在用的AI工具。',
}

// 趋势榜页面 - 支持热度/最新/评分三种排序
interface TrendingPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export const dynamic = 'force-dynamic'

export default async function TrendingPage({ searchParams }: TrendingPageProps) {
  const tab = (searchParams.tab as string) || 'trending'

  // 基础查询条件
  const baseWhere = { isActive: true }

  // 根据tab获取不同排序的数据
  let tools: any[] = []

  if (tab === 'trending') {
    // 热度飙升 - 按upvotes排序，同时获取昨日排名用于计算变化
    tools = await prisma.tool.findMany({
      where: baseWhere,
      orderBy: { upvotes: 'desc' },
      take: 20,
      include: { category: true, trendHistories: { orderBy: { date: 'desc' }, take: 2 } },
    })
  } else if (tab === 'newest') {
    // 最新发布 - 按实际发布时间排序（最近30天）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    tools = await prisma.tool.findMany({
      where: {
        ...baseWhere,
        publishedAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      include: { category: true },
    })
  } else if (tab === 'rated') {
    // 评分最高 - 按stars排序
    tools = await prisma.tool.findMany({
      where: baseWhere,
      orderBy: { stars: 'desc' },
      take: 20,
      include: { category: true },
    })
  }



  // Tab配置
  const tabs = [
    { id: 'trending', label: '热度飙升', icon: Flame, color: 'neon-magenta' },
    { id: 'newest', label: '最新发布', icon: Clock, color: 'neon-cyan' },
    { id: 'rated', label: '评分最高', icon: Star, color: 'neon-green' },
  ]

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />
      
      {/* Header - Cyberpunk Style */}
      <div className="relative border-b border-cyber-border overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-magenta/15 via-transparent to-neon-yellow/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,0,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,255,0.02) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Trophy className="w-8 h-8 text-neon-yellow" />
              <div className="absolute inset-0 w-8 h-8 text-neon-magenta opacity-70 translate-x-[1px]" />
            </div>
            <span className="text-neon-magenta font-mono text-sm tracking-widest uppercase">Top Charts</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-orbitron font-black text-cyber-foreground mb-4 tracking-wide">
            <span className="text-neon-yellow">趋势</span>榜单
          </h1>
          <p className="text-cyber-muted-foreground font-mono max-w-2xl">
            {'>'} 发现近期增长最快的AI工具，把握技术趋势 // 实时排名
          </p>
        </div>
      </div>

      {/* Tabs - Cyberpunk Style */}
      <div className="sticky top-16 z-40 bg-cyber-background/95 backdrop-blur-md border-b border-cyber-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 py-3">
            {tabs.map((t) => {
              const Icon = t.icon
              const isActive = tab === t.id
              const colorClass = t.color === 'neon-magenta' ? 'text-neon-magenta border-neon-magenta' :
                                t.color === 'neon-cyan' ? 'text-neon-cyan border-neon-cyan' :
                                'text-neon-green border-neon-green'
              const glowClass = t.color === 'neon-magenta' ? 'shadow-[0_0_15px_rgba(255,0,255,0.3)]' :
                               t.color === 'neon-cyan' ? 'shadow-[0_0_15px_rgba(0,212,255,0.3)]' :
                               'shadow-[0_0_15px_rgba(0,255,136,0.3)]'
              
              return (
                <Link
                  key={t.id}
                  href={`/trending?tab=${t.id}`}
                  className={`flex items-center gap-2 px-5 py-2.5 font-mono text-sm uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? `${colorClass} bg-${t.color}/10 border-2 ${glowClass}`
                      : 'border border-cyber-border text-cyber-muted-foreground hover:border-cyber-muted-foreground hover:text-cyber-foreground'
                  }`}
                  style={{
                    borderRadius: '8px'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tools List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-orbitron font-bold text-cyber-foreground">
            {tab === 'trending' && '本周热度飙升'}
            {tab === 'newest' && '最新发布工具'}
            {tab === 'rated' && '评分最高工具'}
          </h2>
          <span className="text-sm font-mono text-cyber-muted-foreground">
            // 共 {tools.length} 个
          </span>
        </div>

        {tools.length === 0 ? (
          <div 
            className="text-center py-12 text-cyber-muted-foreground font-mono bg-cyber-card border border-cyber-border"
            style={{ borderRadius: '10px' }}
          >
            暂无数据
          </div>
        ) : (
          <div className="space-y-4">
            {tools.map((tool, index) => (
              <TrendingToolCard
                key={tool.id}
                tool={tool}
                rank={index + 1}
                tab={tab}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
