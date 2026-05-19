import Link from 'next/link'
import { ArrowLeft, Clock, Eye, Share2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import SubscribeCard from '@/components/SubscribeCard'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface NewsDetailPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const newsId = parseInt(params.id, 10)
  if (isNaN(newsId)) return { title: '资讯未找到 | AI Hub' }
  
  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: { title: true, titleZh: true, summary: true }
  })
  if (!news) return { title: '资讯未找到 | AI Hub' }
  
  return {
    title: `${news.titleZh || news.title} - AI资讯 | AI Hub`,
    description: news.summary || `了解最新AI资讯：${news.titleZh || news.title}`,
  }
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const newsId = parseInt(params.id, 10)
  
  if (isNaN(newsId)) {
    notFound()
  }

  // 从数据库获取资讯
  const news = await prisma.news.findUnique({
    where: { id: newsId },
  })

  if (!news) {
    notFound()
  }

  // 获取相关资讯（最新的3条，排除当前这条）
  const otherNews = await prisma.news.findMany({
    where: { 
      id: { not: newsId }
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  })

  // 增加浏览次数
  await prisma.news.update({
    where: { id: newsId },
    data: { viewCount: { increment: 1 } },
  })

  // 从标题和内容提取标签
  const tagKeywords = ['OpenAI', 'GPT', 'Google', 'Gemini', 'Claude', 'Anthropic', '开源', '大模型', '多模态', '图像生成']
  const tags = tagKeywords.filter(tag => 
    news.title.includes(tag) || (news.content?.includes(tag) ?? false)
  )

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />

      {/* Header - Cyberpunk Style */}
      <div className="relative border-b border-cyber-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 via-transparent to-neon-magenta/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-cyber-muted-foreground hover:text-neon-cyan mb-4 font-mono text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {'>'} 返回资讯列表
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Article */}
          <div className="lg:col-span-2">
            <article 
              className="relative overflow-hidden"
              style={{
                clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))'
              }}
            >
              {/* Terminal Header */}
              <div className="bg-cyber-muted px-4 py-2 flex items-center gap-2 border-b border-cyber-border">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-4 text-xs font-mono text-cyber-muted-foreground">news_article.exe</span>
              </div>

              {/* Cover */}
              <div 
                className="h-56 flex items-center justify-center relative overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${stringToColor(news.title)}30, ${stringToColor(news.title)}50)`,
                  borderBottom: '1px solid rgba(42,42,58,0.5)'
                }}
              >
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)'
                }} />
                <span className="text-7xl relative z-10">📰</span>
              </div>

              <div className="p-8 bg-cyber-card border-x border-b border-cyber-border">
                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded font-mono text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h1 className="text-2xl font-bold text-cyber-foreground mb-2 font-orbitron">{news.title}</h1>
                {news.titleZh && (
                  <h2 className="text-xl text-neon-cyan/90 mb-4 font-orbitron">
                    {news.titleZh}
                  </h2>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-cyber-muted-foreground mb-6 pb-6 border-b border-cyber-border font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-neon-cyan" />
                    {formatDate(news.publishedAt || news.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4 text-neon-magenta" />
                    {(news.viewCount + 1).toLocaleString()} 次浏览
                  </span>
                  <span className="text-neon-cyan/70">来源：{news.sourceName}</span>
                </div>

                {/* Summary */}
                {news.summary && (
                  <div className="mb-6 border-l-2 border-neon-cyan pl-4">
                    <p className="text-cyber-muted-foreground text-lg leading-relaxed font-medium">
                      {news.summary}
                    </p>
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-invert max-w-none">
                  {news.content ? (
                    news.content.split('\n\n').map((para, i) => {
                      if (para.startsWith('**') && para.endsWith('**')) {
                        return <h3 key={i} className="text-lg font-semibold text-neon-cyan mt-6 mb-2 font-orbitron">{para.replace(/\*\*/g, '')}</h3>
                      }
                      if (para.includes('\n') && para.match(/^\d+\./)) {
                        return (
                          <ul key={i} className="list-disc pl-5 space-y-1 text-cyber-muted-foreground mb-4">
                            {para.split('\n').map((line, j) => (
                              <li key={j}>{line.replace(/^\d+\.\s/, '')}</li>
                            ))}
                          </ul>
                        )
                      }
                      return <p key={i} className="text-cyber-muted-foreground leading-relaxed mb-4">{para}</p>
                    })
                  ) : (
                    <p className="text-cyber-muted-foreground/50 italic">暂无详细内容</p>
                  )}
                </div>

                {/* Share */}
                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-cyber-border">
                  <span className="text-sm text-cyber-muted-foreground font-mono">{'>'} 分享：</span>
                  <button className="flex items-center gap-2 px-4 py-2 bg-cyber-muted text-cyber-foreground border border-cyber-border hover:border-neon-cyan/50 hover:text-neon-cyan transition-colors text-sm font-mono">
                    <Share2 className="w-4 h-4" />
                    复制链接
                  </button>
                </div>
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related News */}
            <div 
              className="relative overflow-hidden"
              style={{
                clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              <div className="bg-cyber-muted px-4 py-2 flex items-center gap-2 border-b border-cyber-border">
                <span className="text-xs font-mono text-cyber-muted-foreground">related_news.dat</span>
              </div>
              <div className="bg-cyber-card border-x border-b border-cyber-border p-6">
                <h3 className="font-semibold text-cyber-foreground mb-4 font-orbitron flex items-center gap-2">
                  <span className="w-2 h-2 bg-neon-magenta rounded-full animate-pulse" />
                  相关资讯
                </h3>
                <div className="space-y-4">
                  {otherNews.length > 0 ? (
                    otherNews.map(n => (
                      <Link
                        key={n.id}
                        href={`/news/${n.id}`}
                        className="block hover:bg-cyber-muted/50 rounded-lg p-2 -mx-2 transition-colors border-l-2 border-transparent hover:border-neon-cyan"
                      >
                        <p className="text-sm font-medium text-cyber-foreground line-clamp-2 mb-1">{n.title}</p>
                        <p className="text-xs text-cyber-muted-foreground font-mono">{formatDate(n.publishedAt || n.createdAt)}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-cyber-muted-foreground/50 text-sm">暂无相关资讯</p>
                  )}
                </div>
              </div>
            </div>

            {/* Subscribe */}
            <SubscribeCard />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
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
