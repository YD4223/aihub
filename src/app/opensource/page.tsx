import Link from 'next/link'
import { Star, ExternalLink, Github, Code2, Terminal, GitFork, Cpu } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'
import OpenSourceFilter from '@/components/OpenSourceFilter'

interface OpenSourcePageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export const metadata = {
  title: '开源AI项目 | AI Hub',
  description: '发现优秀的开源AI项目，涵盖大语言模型、AI绘画、语音识别等热门开源工具，助力你的开发工作。',
}

// 强制动态渲染，避免缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 根据字符串生成一致的颜色
function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    '#00d4ff', '#00ff88', '#ff00ff', '#ff6b6b', '#ffd93d',
    '#6bcf7f', '#4ecdc4', '#ff6b9d', '#c7ceea', '#95e1d3'
  ]
  return colors[Math.abs(hash) % colors.length]
}

export default async function OpenSourcePage({ searchParams }: OpenSourcePageProps) {
  const lang = searchParams.lang as string | undefined
  const sort = searchParams.sort as string | undefined

  // 排序逻辑
  let orderBy: any = { stars: 'desc' }
  if (sort === 'newest') orderBy = { createdAt: 'desc' }
  else if (sort === 'upvotes') orderBy = { upvotes: 'desc' }

  const where: any = { isActive: true, isOpenSource: true }

  // 分类筛选
  if (lang) {
    where.category = { slug: lang }
  }

  const tools = await prisma.tool.findMany({
    where,
    include: { category: true },
    orderBy,
    take: 50,
  })

  const totalCount = await prisma.tool.count({ where })

  // 获取所有有开源工具的分类（不应用当前分类筛选）
  const allOpenSourceWhere = { isActive: true, isOpenSource: true }
  const categoryStats = await prisma.tool.groupBy({
    by: ['categoryId'],
    where: allOpenSourceWhere,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  const categoryList = await prisma.category.findMany({
    where: { id: { in: categoryStats.map(c => c.categoryId).filter(Boolean) as number[] } },
    select: { id: true, name: true, slug: true },
  })

  const categoryCountMap = Object.fromEntries(
    categoryStats.map(c => [c.categoryId, c._count.id])
  )

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />

      {/* Header - Cyberpunk Style */}
      <div className="relative border-b border-cyber-border overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-green/15 via-transparent to-neon-cyan/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        {/* Code rain effect overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)'
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Code2 className="w-8 h-8 text-neon-green" />
              <div className="absolute inset-0 w-8 h-8 text-neon-cyan opacity-70 translate-x-[1px]" />
            </div>
            <span className="text-neon-green font-mono text-sm tracking-widest uppercase">Open Source</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-orbitron font-black text-cyber-foreground mb-4 tracking-wide">
                <span className="text-neon-green">开源</span>AI项目
              </h1>
              <p className="text-cyber-muted-foreground font-mono max-w-2xl">
                {'>'} 精选GitHub上最受欢迎的开源AI工具 // 完全免费 // 可本地部署
              </p>
            </div>
            
            {/* Stats - Holographic Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: totalCount, label: '开源工具', icon: Terminal },
                { value: categoryList.length, label: '覆盖分类', icon: Cpu },
                { value: '100%', label: '免费使用', icon: Star },
                { value: '每日', label: '自动更新', icon: GitFork },
              ].map((stat, i) => (
                <div 
                  key={stat.label}
                  className="relative group"
                  style={{
                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
                >
                  <div className="bg-cyber-card/80 border border-cyber-border p-4 hover:border-neon-green/50 transition-all duration-300">
                    <stat.icon className="w-5 h-5 text-neon-green mb-2" />
                    <div className="text-2xl font-orbitron font-bold text-cyber-foreground">{stat.value}</div>
                    <div className="text-xs text-cyber-muted-foreground font-mono">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <OpenSourceFilter 
              categories={categoryList} 
              categoryCountMap={categoryCountMap} 
              totalCount={totalCount} 
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <span className="text-cyber-muted-foreground font-mono">
                {'>'} 共 <strong className="text-neon-green">{tools.length}</strong> 个开源项目
              </span>
            </div>

            <div className="space-y-4">
              {tools.map((tool, index) => (
                <div
                  key={tool.id}
                  className="group relative"
                  style={{
                    clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))'
                  }}
                >
                  <div className="bg-cyber-card border border-cyber-border p-5 hover:border-neon-green/50 hover:shadow-[0_0_25px_rgba(0,255,136,0.15)] transition-all duration-300">
                    <div className="flex items-start gap-4">
                      {/* Rank */}
                      <div 
                        className="w-8 h-8 flex items-center justify-center flex-shrink-0 font-orbitron font-bold text-sm text-cyber-muted-foreground bg-cyber-muted border border-cyber-border"
                        style={{
                          clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))'
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Logo - 使用首字母彩色图标 */}
                      <div 
                        className="w-12 h-12 flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                        style={{ 
                          background: `linear-gradient(135deg, ${stringToColor(tool.name)}20, ${stringToColor(tool.name)}40)`,
                          clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))'
                        }}
                      >
                        <span 
                          className="text-xl font-bold"
                          style={{ color: stringToColor(tool.name) }}
                        >
                          {tool.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link
                              href={`/tools/${tool.slug}`}
                              className="text-lg font-semibold text-cyber-foreground hover:text-neon-green transition-colors"
                            >
                              {tool.name}
                            </Link>
                            {tool.category && (
                              <span 
                                className="ml-2 px-2 py-0.5 bg-cyber-muted text-cyber-muted-foreground text-xs font-mono border border-cyber-border"
                                style={{
                                  clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))'
                                }}
                              >
                                {tool.category.name}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {tool.githubUrl && (
                              <a
                                href={tool.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 bg-cyber-muted text-cyber-foreground border border-cyber-border text-sm hover:border-neon-green hover:text-neon-green transition-all duration-200 font-mono"
                                style={{
                                  clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))'
                                }}
                              >
                                <Github className="w-4 h-4" />
                                GitHub
                              </a>
                            )}
                            {tool.websiteUrl && (
                            <a
                              href={tool.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-neon-green/10 text-neon-green border border-neon-green text-sm hover:bg-neon-green hover:text-cyber-background transition-all duration-200 font-mono"
                              style={{
                                clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))'
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                              官网
                            </a>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-cyber-muted-foreground mt-2 text-sm line-clamp-2">{tool.shortDesc}</p>

                        {/* Tags */}
                        {tool.tags && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {tool.tags.split(',').slice(0, 4).map(tag => tag.trim()).filter(Boolean).map((tag) => (
                              <span 
                                key={tag} 
                                className="px-2 py-1 bg-cyber-muted text-cyber-muted-foreground text-xs font-mono border border-cyber-border hover:border-neon-cyan hover:text-neon-cyan transition-colors cursor-pointer"
                                style={{
                                  clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))'
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-6 mt-3 text-sm font-mono">
                          <span className="flex items-center gap-1 text-cyber-muted-foreground">
                            <Star className="w-4 h-4 text-neon-yellow" />
                            {tool.stars > 0 ? tool.stars.toLocaleString() : '—'}
                          </span>
                          <span 
                            className="px-2 py-0.5 bg-neon-green/10 text-neon-green text-xs border border-neon-green/50"
                            style={{
                              clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))'
                            }}
                          >
                            开源免费
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {tools.length === 0 && (
              <div 
                className="text-center py-20 bg-cyber-card border border-cyber-border"
                style={{
                  clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))'
                }}
              >
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-orbitron font-semibold text-cyber-foreground">暂无数据</h3>
                <p className="text-cyber-muted-foreground mt-2 font-mono">未找到符合条件的开源项目</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
