import Link from 'next/link'
import { ArrowRight, Zap, Globe, MessageCircle, Heart, Terminal, Cpu, Radio } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ToolCard from '@/components/ToolCard'
import { getShareImages } from '@/lib/share-image'

// ISR: 每5分钟在后台重新生成一次静态页面
// 访客始终访问 CDN 上的静态 HTML，无需跑 Serverless 函数
export const revalidate = 300

export async function generateMetadata() {
  const [totalTools, totalOpensource] = await Promise.all([
    prisma.tool.count({ where: { isActive: true } }),
    prisma.tool.count({ where: { isActive: true, isOpenSource: true } }),
  ])
  return {
    title: `AI Hub - 全球AI工具聚合平台 | 发现${totalTools}+实用AI工具`,
    description: `AI Hub收录${totalTools}+个AI工具（含${totalOpensource}+开源），涵盖聊天对话、图像生成、视频生成、代码助手等16个分类。每日更新最新AI资讯和开源项目，一站式发现全球AI工具。`,
    openGraph: {
      title: `AI Hub - 全球AI工具聚合平台 | ${totalTools}+AI工具`,
      description: `收录${totalTools}+个AI工具，每日更新最新AI资讯`,
    },
  }
}

// Glitch Heading Component
function GlitchHeading({ text, className = '' }: { text: string; className?: string }) {
  return (
    <h1 
      className={`relative font-orbitron font-black uppercase tracking-wider ${className}`}
      data-text={text}
    >
      <span className="relative z-10">{text}</span>
      <span 
        className="absolute top-0 left-0 -z-10 text-neon-magenta opacity-70"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)', transform: 'translateX(-2px)' }}
      >
        {text}
      </span>
      <span 
        className="absolute top-0 left-0 -z-10 text-neon-cyan opacity-70"
        style={{ clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)', transform: 'translateX(2px)' }}
      >
        {text}
      </span>
    </h1>
  )
}

// Neon Stat Card
function StatCard({ value, label, icon: Icon, color }: { value: string; label: string; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'border-neon-green text-neon-green shadow-neon',
    cyan: 'border-neon-cyan text-neon-cyan shadow-neon-tertiary',
    magenta: 'border-neon-magenta text-neon-magenta shadow-neon-secondary',
    yellow: 'border-neon-yellow text-neon-yellow shadow-neon-yellow',
  }
  
  return (
    <div className={`relative p-6 border ${colorMap[color]} bg-cyber-card/50 backdrop-blur-sm group hover:-translate-y-1 transition-transform duration-300`}>  
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-5 h-5 ${color === 'green' ? 'text-neon-green' : color === 'cyan' ? 'text-neon-cyan' : color === 'magenta' ? 'text-neon-magenta' : 'text-neon-yellow'}`} />
        <span className="text-3xl font-orbitron font-black text-cyber-foreground">{value}</span>
      </div>
      <span className="text-sm text-cyber-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current opacity-50" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current opacity-50" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current opacity-50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current opacity-50" />
    </div>
  )
}

// Category Card
function CategoryCard({ name, icon, count, href, color }: { name: string; icon: string; count: number | string; href: string; color: string }) {
  const colorMap: Record<string, { border: string; text: string; glow: string }> = {
    green: { border: 'border-neon-green', text: 'text-neon-green', glow: 'hover:shadow-neon' },
    magenta: { border: 'border-neon-magenta', text: 'text-neon-magenta', glow: 'hover:shadow-neon-secondary' },
    cyan: { border: 'border-neon-cyan', text: 'text-neon-cyan', glow: 'hover:shadow-neon-tertiary' },
    yellow: { border: 'border-neon-yellow', text: 'text-neon-yellow', glow: '' },
  }
  
  const colors = colorMap[color] || colorMap.green
  
  return (
    <Link
      href={href}
      className={`relative p-6 border ${colors.border} bg-cyber-card/30 transition-all duration-300 hover:-translate-y-1 ${colors.glow} group`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <div className={`font-orbitron font-bold ${colors.text} group-hover:text-cyber-foreground transition-colors`}>
        {name}
      </div>
      <div className="text-sm text-cyber-muted-foreground font-mono mt-1">
        {Number(count) > 0 ? `${count} 个工具` : '即将上线'}
      </div>
    </Link>
  )
}

export default async function HomePage() {
  // 获取推荐工具
  const featuredTools = await prisma.tool.findMany({
    where: { isFeatured: true, isActive: true },
    include: { category: true },
    orderBy: { stars: 'desc' },
    take: 4,
  })

  // 获取最新工具
  const latestTools = await prisma.tool.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  // 统计数据
  const totalTools = await prisma.tool.count({ where: { isActive: true } })
  const totalOpensource = await prisma.tool.count({ 
    where: { isActive: true, isOpenSource: true } 
  })
  const totalCategories = await prisma.category.count()

  // 各分类工具数量
  const categoryCounts = await prisma.tool.groupBy({
    by: ['categoryId'],
    where: { isActive: true },
    _count: { id: true },
  })
  // 获取分类信息
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true },
  })
  const categoryCountMap = Object.fromEntries(
    categoryCounts.map(c => [c.categoryId, c._count.id])
  )
  const getCategoryCount = (slug: string) => {
    const cat = categories.find(c => c.slug === slug)
    if (!cat) return 0
    return categoryCountMap[cat.id] || 0
  }

  // 获取最新资讯
  const latestNews = await prisma.news.findMany({
    take: 3,
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      imageUrl: true,
      sourceName: true,
      publishedAt: true,
      createdAt: true,
    },
  })

  // 获取最新用户分享
  const latestShares = await prisma.share.findMany({
    where: { status: 'approved' },
    include: {
      tool: { include: { category: true } },
      user: true,
      _count: { select: { comments: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-background via-cyber-muted/20 to-cyber-background" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 255, 136, 0.1) 0%, transparent 50%)'
        }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Terminal Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-neon-green/50 bg-neon-green/5 mb-8">
              <Radio className="w-4 h-4 text-neon-green animate-pulse" />
              <span className="text-sm font-mono text-neon-green uppercase tracking-wider">
                已收录 {totalTools}+ AI工具
              </span>
            </div>
            
            {/* Glitch Title */}
            <GlitchHeading 
              text="发现全球最新AI工具" 
              className="text-4xl md:text-6xl lg:text-7xl mb-6 text-cyber-foreground"
            />
            
            {/* Subtitle with typing effect style */}
            <p className="text-lg md:text-xl text-cyber-muted-foreground mb-8 font-mono max-w-2xl mx-auto">
              <span className="text-neon-green">{'>'}</span> 聚合全球AI软件、开源项目和最新资讯
              <span className="inline-block w-3 h-5 bg-neon-green ml-1 animate-blink" />
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/tools"
                className="btn-cyber-glow inline-flex items-center justify-center gap-2 text-base md:text-lg px-8 py-4"
              >
                浏览工具
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/news"
                className="btn-cyber-outline-neon inline-flex items-center justify-center gap-2 text-base md:text-lg px-8 py-4"
              >
                最新资讯
              </Link>
            </div>
          </div>
        </div>
        
        {/* Stats Section */}
        <div className="border-t border-cyber-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard value={`${totalTools}+`} label="AI工具" icon={Cpu} color="green" />
              <StatCard value={`${totalOpensource}+`} label="开源项目" icon={Terminal} color="cyan" />
              <StatCard value={`${totalCategories}+`} label="工具分类" icon={Globe} color="magenta" />
              <StatCard value="每日" label="自动更新" icon={Radio} color="yellow" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-orbitron font-bold text-cyber-foreground uppercase tracking-wider">
                <span className="text-neon-green">{'>'}</span> 热门工具
              </h2>
              <p className="text-cyber-muted-foreground mt-1 font-mono text-sm">本周最受欢迎的AI工具</p>
            </div>
            <Link
              href="/tools"
              className="btn-cyber-outline text-xs py-2 px-4"
            >
              查看全部
              <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-cyber-muted/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <h2 className="text-2xl font-orbitron font-bold text-cyber-foreground uppercase tracking-wider text-center mb-12">
            <span className="text-neon-cyan">{'>'}</span> 探索AI工具分类
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-1">
            {[
              { name: 'AI聊天', icon: '💬', slug: 'chat', color: 'green' },
              { name: 'AI绘画', icon: '🎨', slug: 'image', color: 'magenta' },
              { name: 'AI视频', icon: '🎬', slug: 'video', color: 'cyan' },
              { name: 'AI音频', icon: '🎵', slug: 'audio', color: 'yellow' },
              { name: 'AI编程', icon: '💻', slug: 'coding', color: 'green' },
              { name: 'AI写作', icon: '✍️', slug: 'writing', color: 'magenta' },
              { name: 'AI搜索', icon: '🔍', slug: 'search', color: 'cyan' },
              { name: 'AI办公', icon: '📊', slug: 'productivity', color: 'yellow' },
              { name: '开源免费', icon: '🚀', slug: 'opensource', color: 'green', isSource: true },
              { name: '用户分享', icon: '🙋', slug: 'user-share', color: 'magenta', isSpecial: true },
            ].map((cat) => {
              const count = cat.isSource
                ? (cat.slug === 'opensource' ? totalOpensource : totalTools - totalOpensource)
                : cat.isSpecial 
                  ? latestShares.length 
                  : getCategoryCount(cat.slug)
              
              return (
                <CategoryCard
                  key={cat.name}
                  name={cat.name}
                  icon={cat.icon}
                  count={count}
                  href={cat.isSpecial ? `/${cat.slug}` : (cat.isSource ? `/tools?source=${cat.slug}` : `/tools?category=${cat.slug}`)}
                  color={cat.color}
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* User Shares */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-orbitron font-bold text-cyber-foreground uppercase tracking-wider">
                <span className="text-neon-magenta">{'>'}</span> 用户分享
              </h2>
              <p className="text-cyber-muted-foreground mt-1 font-mono text-sm">看看大家都在用什么AI工具</p>
            </div>
            <Link
              href="/user-share"
              className="btn-cyber-outline text-xs py-2 px-4"
            >
              查看更多
              <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestShares.map((share) => {
              const shareImages = getShareImages(share.id, share.images)
              return (
                <Link
                  key={share.id}
                  href={`/user-share`}
                  className="card-cyber p-0 overflow-hidden flex flex-col h-[320px] group"
                >
                  {/* 工具信息 - 固定高度 */}
                  <div className="p-4 border-b border-cyber-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 flex items-center justify-center text-lg font-bold text-cyber-background flex-shrink-0 clip-chamfer-sm"
                        style={{ 
                          background: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',
                          boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)'
                        }}
                      >
                        {share.tool?.name 
                          ? share.tool.name.trim().charAt(0).toUpperCase() 
                          : share.submitToolName 
                            ? share.submitToolName.trim().charAt(0).toUpperCase() 
                            : '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-orbitron font-bold text-cyber-foreground truncate group-hover:text-neon-green transition-colors">
                          {share.tool?.name || share.submitToolName || (share.type === 'life' ? '生活分享' : '工具分享')}
                        </h3>
                        <p className="text-xs text-cyber-muted-foreground truncate font-mono">{share.tool?.shortDesc || share.tool?.description?.slice(0, 30) || share.submitToolDesc || (share.type === 'life' ? '来自社区的精彩分享' : '用户提交的AI工具')}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 分享内容 - 自适应高度 */}
                  <div className="p-4 flex-1 flex flex-col min-h-0">
                    {/* 用户信息 */}
                    <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                      {share.user?.avatarUrl ? (
                        <div className="w-6 h-6 clip-chamfer-sm overflow-hidden flex-shrink-0">
                          <img src={share.user.avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div 
                          className="w-6 h-6 flex items-center justify-center text-cyber-background text-xs font-medium clip-chamfer-sm"
                          style={{ 
                            background: `linear-gradient(135deg, #ff00ff 0%, #00d4ff 100%)`,
                          }}
                        >
                          {share.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-cyber-foreground font-mono">{share.user.username}</span>
                      {share.user?.role === 'ADMIN' && (
                        <span className="px-1 py-0.5 text-[8px] font-bold text-black" style={{ background: 'linear-gradient(135deg, #ffd700, #ff8c00)', clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                          👑 站长
                        </span>
                      )}
                      <span className="text-xs text-cyber-muted-foreground font-mono">
                        {new Date(share.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    {/* 分享文字 - 固定行数 */}
                    <p className="text-cyber-muted-foreground text-sm line-clamp-2 mb-3 flex-shrink-0 font-mono">
                      {share.content}
                    </p>
                    
                    {/* 分享图片 - 固定高度区域 */}
                    <div className="flex-1 min-h-0 flex items-end">
                      {shareImages.length > 0 ? (
                        <div className="flex gap-2">
                          {shareImages.slice(0, 3).map((img, idx) => (
                            <div key={idx} className="w-16 h-16 clip-chamfer-sm overflow-hidden bg-cyber-muted border border-cyber-border flex-shrink-0">
                              <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {shareImages.length > 3 && (
                            <div className="w-16 h-16 clip-chamfer-sm bg-cyber-muted border border-cyber-border flex items-center justify-center text-xs text-cyber-muted-foreground flex-shrink-0 font-mono">
                              +{shareImages.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-16 clip-chamfer-sm bg-cyber-muted/50 border border-cyber-border flex items-center justify-center text-xs text-cyber-muted-foreground font-mono">
                          暂无图片
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 互动数据 - 固定底部 */}
                  <div className="px-4 py-3 border-t border-cyber-border flex items-center gap-4 text-sm text-cyber-muted-foreground flex-shrink-0 font-mono">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-neon-magenta" />
                      {share.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 text-neon-cyan" />
                      {Number(share._count.comments || 0)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-cyber-muted/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-orbitron font-bold text-cyber-foreground uppercase tracking-wider">
                <span className="text-neon-cyan">{'>'}</span> AI资讯
              </h2>
              <p className="text-cyber-muted-foreground mt-1 font-mono text-sm">全球AI行业最新动态</p>
            </div>
            <Link
              href="/news"
              className="btn-cyber-outline text-xs py-2 px-4"
            >
              更多资讯
              <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestNews.length > 0 ? latestNews.map((news) => (
              <Link
                key={news.id}
                href={`/news/${news.id}`}
                className="card-cyber p-6"
              >
                <div className="text-sm text-cyber-muted-foreground mb-2 font-mono">
                  {news.sourceName} · {new Date(news.publishedAt || news.createdAt).toLocaleDateString('zh-CN')}
                </div>
                <h3 className="font-orbitron font-bold text-cyber-foreground mb-1 line-clamp-2 group-hover:text-neon-green transition-colors">
                  {news.title}
                </h3>
                {(news as any).titleZh && (
                  <h4 className="text-sm text-neon-cyan/80 mb-2 line-clamp-2 font-medium">
                    {(news as any).titleZh}
                  </h4>
                )}
                <p className="text-sm text-cyber-muted-foreground line-clamp-2 font-mono">
                  {news.summary}
                </p>
              </Link>
            )) : (
              <div className="col-span-3 text-center py-12">
                <Terminal className="w-12 h-12 text-cyber-muted-foreground mx-auto mb-4" />
                <p className="text-cyber-muted-foreground font-mono">资讯模块开发中...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-green/5 via-cyber-muted/10 to-neon-magenta/5" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl md:text-4xl font-orbitron font-black text-cyber-foreground uppercase tracking-wider mb-4">
            发现更多<span className="text-neon-green">AI工具</span>
          </h2>
          <p className="text-cyber-muted-foreground mb-8 font-mono">
            提交你的AI产品，或分享你的使用体验
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/submit"
              className="btn-cyber-glow inline-flex items-center justify-center gap-2 px-8 py-4"
            >
              <Zap className="w-5 h-5" />
              提交工具
            </Link>
            <Link
              href="/user-share"
              className="btn-cyber-glow-magenta inline-flex items-center justify-center gap-2 px-8 py-4"
            >
              <MessageCircle className="w-5 h-5" />
              去分享
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
