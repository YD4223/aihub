import Link from 'next/link'
import { ArrowLeft, ExternalLink, Github, Star, Heart, Flag, Share2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ToolShareSection from '@/components/ToolShareSection'
import FavoriteButton from '@/components/FavoriteButton'
import LikeButton from '@/components/LikeButton'
import ReportButton from '@/components/ReportButton'
import ShareExperienceButton from './ShareExperienceButton'
import ViewTracker from './ViewTracker'
import LiveStats from './LiveStats'
import { prisma } from '@/lib/prisma'
import { formatNumber, formatDate } from '@/lib/utils'

interface ToolPageProps {
  params: { slug: string }
}

// 根据字符串生成一致的颜色
function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
    '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16'
  ]
  return colors[Math.abs(hash) % colors.length]
}

const pricingLabels: Record<string, string> = {
  FREE: '免费',
  FREEMIUM: '免费增值',
  PAID: '付费',
  OPEN_SOURCE: '开源',
  CONTACT: '联系询价',
}

const pricingColors: Record<string, string> = {
  FREE: 'bg-green-100 text-green-700',
  FREEMIUM: 'bg-blue-100 text-blue-700',
  PAID: 'bg-purple-100 text-purple-700',
  OPEN_SOURCE: 'bg-orange-100 text-orange-700',
  CONTACT: 'bg-gray-100 text-gray-700',
}

// 处理 tags 字符串为数组
function parseTags(tags: string | null): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

export default async function ToolPage({ params }: ToolPageProps) {
  // 解码 URL 编码的 slug（处理中文等特殊字符）
  const decodedSlug = decodeURIComponent(params.slug)
  
  // 从数据库获取工具数据
  const tool = await prisma.tool.findUnique({
    where: { slug: decodedSlug },
    include: { category: true },
  })

  if (!tool) {
    notFound()
  }

  // 获取相关工具（同分类的其他工具）
  const relatedTools = await prisma.tool.findMany({
    where: { 
      categoryId: tool.categoryId,
      isActive: true,
      id: { not: tool.id }
    },
    take: 3,
  })

  // 获取该工具的点赞总数
  const likeCountResult = await prisma.$queryRawUnsafe<Array<{total: number}>>(
    `SELECT COUNT(*) as total FROM user_like_tools WHERE tool_id = ${tool.id}`
  )
  const likeCount = Number(likeCountResult[0]?.total || 0)

  // 赛博朋克风格定价标签
  const cyberPricingColors: Record<string, string> = {
    FREE: 'bg-neon-green/10 text-neon-green border-neon-green/30',
    FREEMIUM: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30',
    PAID: 'bg-neon-magenta/10 text-neon-magenta border-neon-magenta/30',
    OPEN_SOURCE: 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30',
    CONTACT: 'bg-cyber-muted/30 text-cyber-muted-foreground border-cyber-border',
  }

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-cyber-muted-foreground hover:text-neon-cyan mb-6 font-mono transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {'<'} 返回工具列表
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Header Card */}
            <div className="bg-cyber-card border border-cyber-border p-8 relative"
              style={{ clipPath: 'polygon(0 16px, 16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px))' }}>
              {/* 四角装饰 */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-cyan" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-cyan" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-cyan" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-cyan" />
              
              <div className="flex items-start gap-6">
                {/* Logo - 使用首字母彩色图标 */}
                <div 
                  className="w-24 h-24 flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(255,0,255,0.1))',
                    border: '2px solid rgba(0,255,255,0.3)',
                    clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))'
                  }}
                >
                  <span 
                    className="text-5xl font-bold font-orbitron"
                    style={{ color: stringToColor(tool.name) }}
                  >
                    {tool.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-cyber-foreground font-orbitron break-words">{tool.name}</h1>
                      {tool.category && (
                        <Link
                          href={`/tools?category=${tool.category.slug}`}
                          className="text-neon-cyan hover:text-neon-magenta transition-colors font-mono text-sm"
                        >
                          {'>'} {tool.category.name}
                        </Link>
                      )}
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium border w-fit ${cyberPricingColors[tool.pricingType]}`}
                      style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                      {pricingLabels[tool.pricingType]}
                    </span>
                  </div>

                  <p className="text-cyber-muted-foreground mt-3 text-lg font-mono">{tool.shortDesc}</p>

                  {/* Stats - 实时更新 */}
                  <div className="flex items-center gap-3 md:gap-6 mt-4 text-sm text-cyber-muted-foreground font-mono flex-wrap">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Star className="w-4 h-4 text-neon-yellow flex-shrink-0" />
                      {formatNumber(tool.stars)} stars
                    </span>
                    <LiveStats toolId={tool.id} initialLikeCount={likeCount} initialViewCount={tool.viewCount} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-8">
                {tool.websiteUrl && (
                  <a
                    href={tool.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-neon-cyan text-cyber-background px-6 py-3 font-orbitron font-semibold hover:shadow-neon-cyan transition-all"
                    style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
                  >
                    <ExternalLink className="w-5 h-5" />
                    访问官网
                  </a>
                )}
                {tool.githubUrl && (
                  <a
                    href={tool.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-cyber-muted/50 text-cyber-foreground border border-cyber-border px-6 py-3 font-orbitron font-semibold hover:border-neon-cyan/50 transition-all"
                    style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
                  >
                    <Github className="w-5 h-5" />
                    GitHub
                  </a>
                )}
                <LikeButton 
                  toolId={tool.id} 
                  toolData={{
                    id: tool.id,
                    slug: tool.slug,
                    name: tool.name,
                    description: tool.shortDesc || tool.description || '',
                    iconUrl: null,
                    websiteUrl: tool.websiteUrl || '',
                    category: tool.category?.name || '未分类'
                  }}
                />
                <FavoriteButton 
                  toolId={tool.id}
                  toolData={{
                    id: tool.id,
                    slug: tool.slug,
                    name: tool.name,
                    description: tool.shortDesc || tool.description || '',
                    iconUrl: null,
                    websiteUrl: tool.websiteUrl || '',
                    category: tool.category?.name || '未分类'
                  }}
                />
                <a
                  href="#share-section"
                  className="flex items-center gap-2 bg-cyber-muted/30 text-cyber-foreground border border-cyber-border px-6 py-3 font-orbitron font-semibold hover:border-neon-cyan/50 transition-all"
                  style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
                >
                  <Share2 className="w-5 h-5" />
                  分享
                </a>
                <ShareExperienceButton
                  tool={{
                    id: tool.id,
                    name: tool.name,
                    slug: tool.slug,
                    shortDesc: tool.shortDesc || '',
                    logoUrl: tool.logoUrl,
                    categoryName: tool.category?.name
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="bg-cyber-card border border-cyber-border p-8 mt-6 relative"
              style={{ clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))' }}>
              <h2 className="text-xl font-bold text-cyber-foreground mb-4 font-orbitron flex items-center gap-2">
                <span className="text-neon-cyan">{'>'}</span> 工具介绍
              </h2>
              <p className="text-cyber-muted-foreground leading-relaxed font-mono">{tool.description}</p>
              
              {tool.description && (
                <>
                  <h3 className="text-lg font-semibold text-cyber-foreground mt-6 mb-3 font-orbitron flex items-center gap-2">
                    <span className="text-neon-magenta">{'>'}</span> 主要功能
                  </h3>
                  <p className="text-cyber-muted-foreground leading-relaxed font-mono">{tool.description}</p>
                </>
              )}
            </div>

            {/* Tags */}
            {parseTags(tool.tags).length > 0 && (
              <div className="bg-cyber-card border border-cyber-border p-8 mt-6 relative"
                style={{ clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))' }}>
                <h2 className="text-xl font-bold text-cyber-foreground mb-4 font-orbitron flex items-center gap-2">
                  <span className="text-neon-cyan">{'>'}</span> 标签
                </h2>
                <div className="flex flex-wrap gap-2">
                  {parseTags(tool.tags).map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 bg-cyber-muted/30 text-cyber-muted-foreground border border-cyber-border text-sm hover:border-neon-cyan/50 hover:text-neon-cyan cursor-pointer transition-colors font-mono"
                      style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 分享讨论区域 */}
            <div id="share-section">
              <ToolShareSection
                toolId={tool.id}
                toolName={tool.name}
                toolSlug={tool.slug}
                toolDesc={tool.shortDesc || tool.description || ''}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-cyber-card border border-cyber-border p-6 relative"
              style={{ clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))' }}>
              {/* 四角装饰 */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-neon-magenta" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-neon-magenta" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-neon-magenta" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-neon-magenta" />
              
              <h3 className="font-semibold text-cyber-foreground mb-4 font-orbitron">{'>'} 工具信息</h3>
              <div className="space-y-3 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-cyber-muted-foreground">发布日期</span>
                  <span className="text-cyber-foreground">{formatDate(tool.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-muted-foreground">最后更新</span>
                  <span className="text-cyber-foreground">{formatDate(tool.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-muted-foreground">分类</span>
                  <span className="text-cyber-foreground">{tool.category?.name || '未分类'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-muted-foreground">定价</span>
                  <span className="text-cyber-foreground">{pricingLabels[tool.pricingType]}</span>
                </div>
              </div>
            </div>

            {/* Related Tools */}
            <div className="bg-cyber-card border border-cyber-border p-6 relative"
              style={{ clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))' }}>
              <h3 className="font-semibold text-cyber-foreground mb-4 font-orbitron">{'>'} 相关工具</h3>
              <div className="space-y-4">
                {relatedTools.map((related) => (
                  <Link
                    key={related.id}
                    href={`/tools/${related.slug}`}
                    className="flex items-center gap-3 p-3 hover:bg-cyber-muted/20 transition-colors border border-transparent hover:border-neon-cyan/30"
                    style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
                  >
                    <div 
                      className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(255,0,255,0.1))',
                        border: '1px solid rgba(0,255,255,0.2)',
                        clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))'
                      }}
                    >
                      <span 
                        className="text-xl font-bold font-orbitron"
                        style={{ color: stringToColor(related.name) }}
                      >
                        {related.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-cyber-foreground font-orbitron">{related.name}</div>
                      <div className="text-sm text-cyber-muted-foreground truncate font-mono">{related.shortDesc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Report */}
            <ReportButton 
              type="tool" 
              targetId={tool.id} 
              targetTitle={tool.name}
            />
          </div>
        </div>
      </div>

      <ViewTracker toolId={tool.id} />
      <Footer />
    </div>
  )
}
