'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Eye, Newspaper, Sparkles, ChevronLeft, ChevronRight, Mail, Check, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { formatDate } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface News {
  id: number
  title: string
  titleZh: string | null
  summary: string | null
  summaryZh: string | null
  sourceName: string
  isAutoCrawled: boolean
  publishedAt: Date | null
  createdAt: Date
  viewCount: number
}

const ITEMS_PER_PAGE = 10

export default function NewsPage() {
  const [newsList, setNewsList] = useState<News[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [tagCounts, setTagCounts] = useState<{name: string, count: number}[]>([])

  useEffect(() => {
    fetchNews(currentPage)
    fetchTags()
  }, [currentPage])

  async function fetchNews(page: number) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/news?page=${page}&limit=${ITEMS_PER_PAGE}`)
      const data = await response.json()
      setNewsList(data.news)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchTags() {
    try {
      const response = await fetch('/api/news/tags')
      const data = await response.json()
      setTagCounts(data.tags)
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />
      
      {/* Header - Cyberpunk Style */}
      <div className="relative border-b border-cyber-border overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 via-transparent to-neon-magenta/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Newspaper className="w-8 h-8 text-neon-cyan" />
              <div className="absolute inset-0 w-8 h-8 text-neon-magenta opacity-70 translate-x-[1px]" />
            </div>
            <span className="text-neon-cyan font-mono text-sm tracking-widest uppercase">Latest Intel</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-orbitron font-black text-cyber-foreground mb-4 tracking-wide">
            <span className="text-neon-cyan">AI</span> 资讯
          </h1>
          <p className="text-cyber-muted-foreground font-mono max-w-2xl">
            {'>'} 全球AI行业最新动态和深度报道 // 实时更新
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full" />
              </div>
            ) : newsList.length > 0 ? (
              <>
                {/* Featured News - Terminal Style (only on first page) */}
                {currentPage === 1 && newsList[0] && (
                  <div 
                    className="relative mb-8 overflow-hidden group"
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
                      <span className="ml-4 text-xs font-mono text-cyber-muted-foreground">featured_news.exe</span>
                    </div>
                    
                    {/* Content */}
                    <div className="bg-cyber-card border-x border-b border-cyber-border">
                      <div 
                        className="h-48 flex items-center justify-center relative overflow-hidden"
                        style={{ 
                          background: `linear-gradient(135deg, ${stringToColor(newsList[0].title)}20, ${stringToColor(newsList[0].title)}40)`, 
                          borderBottom: '1px solid rgba(42,42,58,0.5)'
                        }}
                      >
                        <div className="absolute inset-0 opacity-20" style={{
                          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)'
                        }} />
                        <span className="text-6xl relative z-10">📰</span>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 text-sm font-mono mb-3">
                          <span className="px-2 py-1 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 text-xs uppercase tracking-wider">
                            头条
                          </span>
                          <span className="text-cyber-muted-foreground">{newsList[0].sourceName}</span>
                          <span className="text-cyber-border">|</span>
                          <span className="text-neon-cyan">{formatDate(newsList[0].publishedAt || newsList[0].createdAt)}</span>
                        </div>
                        <h2 className="text-2xl font-orbitron font-bold text-cyber-foreground mb-3 group-hover:text-neon-cyan transition-colors">
                          {newsList[0].title}
                        </h2>
                        {newsList[0].titleZh && (
                          <h3 className="text-xl text-neon-cyan/80 mb-3 font-orbitron">
                            {newsList[0].titleZh}
                          </h3>
                        )}
                        <p className="text-cyber-muted-foreground mb-2 line-clamp-2">{newsList[0].summary}</p>
                        {newsList[0].summaryZh && (
                          <p className="text-neon-cyan/70 mb-4 line-clamp-2">{newsList[0].summaryZh}</p>
                        )}
                        <Link
                          href={`/news/${newsList[0].id}`}
                          className="inline-flex items-center gap-2 text-neon-cyan hover:text-neon-magenta font-mono text-sm uppercase tracking-wider transition-colors group/link"
                        >
                          阅读全文
                          <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* News List - Cyberpunk Cards */}
                <div className="space-y-4">
                  {(currentPage === 1 ? newsList.slice(1) : newsList).map((news) => (
                    <Link
                      key={news.id}
                      href={`/news/${news.id}`}
                      className="block group"
                      style={{
                        clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                      }}
                    >
                      <div className="bg-cyber-card border border-cyber-border p-5 hover:border-neon-cyan/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.15)] transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div 
                            className="w-20 h-20 flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                            style={{ 
                              background: `linear-gradient(135deg, ${stringToColor(news.title)}15, ${stringToColor(news.title)}30)`,
                              clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))'
                            }}
                          >
                            <span className="text-2xl relative z-10">📄</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs font-mono mb-2">
                              <span className="text-cyber-muted-foreground">{news.sourceName}</span>
                              {news.isAutoCrawled && (
                                <span className="px-2 py-0.5 bg-cyber-muted text-cyber-muted-foreground border border-cyber-border text-xs">
                                  自动采集
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-cyber-foreground mb-1 line-clamp-2 group-hover:text-neon-cyan transition-colors">
                              {news.title}
                            </h3>
                            {news.titleZh && (
                              <h4 className="text-base text-neon-cyan/80 mb-2 line-clamp-2 font-medium">
                                {news.titleZh}
                              </h4>
                            )}
                            <p className="text-cyber-muted-foreground text-sm line-clamp-2 mb-1">
                              {news.summary}
                            </p>
                            {news.summaryZh && (
                              <p className="text-neon-cyan/70 text-sm line-clamp-2">
                                {news.summaryZh}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs font-mono text-cyber-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-neon-cyan" />
                                {formatDate(news.publishedAt || news.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-neon-magenta" />
                                {news.viewCount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination - Cyberpunk Style */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-cyber-card border border-cyber-border text-cyber-foreground hover:border-neon-cyan hover:text-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm"
                      style={{
                        clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)'
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`min-w-[36px] px-3 py-2 border font-mono text-sm transition-all ${
                              currentPage === pageNum
                                ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                : 'bg-cyber-card border-cyber-border text-cyber-foreground hover:border-neon-cyan/50'
                            }`}
                            style={{
                              clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)'
                            }}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="text-cyber-muted-foreground px-1">...</span>
                          <button
                            onClick={() => goToPage(totalPages)}
                            className="min-w-[36px] px-3 py-2 bg-cyber-card border border-cyber-border text-cyber-foreground hover:border-neon-cyan/50 font-mono text-sm transition-colors"
                            style={{
                              clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)'
                            }}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-cyber-card border border-cyber-border text-cyber-foreground hover:border-neon-cyan hover:text-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm"
                      style={{
                        clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)'
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Page Info */}
                <div className="mt-4 text-center text-sm text-cyber-muted-foreground font-mono">
                  第 {currentPage} / {totalPages} 页
                </div>
              </>
            ) : (
              <div 
                className="text-center py-20 bg-cyber-card border border-cyber-border"
                style={{
                  clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))'
                }}
              >
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-orbitron font-semibold text-cyber-foreground">暂无资讯</h3>
                <p className="text-cyber-muted-foreground mt-2 font-mono">敬请期待最新AI动态</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hot Tags - Cyberpunk Style */}
            <div 
              className="bg-cyber-card border border-cyber-border overflow-hidden"
              style={{
                clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))'
              }}
            >
              <div className="px-5 py-4 border-b border-cyber-border bg-cyber-muted/50">
                <h3 className="font-orbitron font-semibold text-cyber-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neon-magenta" />
                  热门标签
                </h3>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {tagCounts.length > 0 ? (
                    tagCounts.map((tag) => (
                      <span
                        key={tag.name}
                        className="px-3 py-1.5 bg-cyber-muted text-cyber-muted-foreground border border-cyber-border text-sm hover:border-neon-magenta hover:text-neon-magenta hover:shadow-[0_0_10px_rgba(255,0,255,0.2)] cursor-pointer transition-all duration-200 font-mono"
                        style={{
                          clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))'
                        }}
                      >
                        {tag.name} <span className="text-neon-magenta">({tag.count})</span>
                      </span>
                    ))
                  ) : (
                    <p className="text-cyber-muted-foreground text-sm font-mono">暂无标签数据</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sources - Cyberpunk Style */}
            <div 
              className="bg-cyber-card border border-cyber-border overflow-hidden"
              style={{
                clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))'
              }}
            >
              <div className="px-5 py-4 border-b border-cyber-border bg-cyber-muted/50">
                <h3 className="font-orbitron font-semibold text-cyber-foreground">资讯来源</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { name: '量子位', status: '正常' },
                  { name: 'MarkTechPost', status: '正常' },
                  { name: 'TechCrunch AI', status: '正常' },
                  { name: 'Ars Technica AI', status: '正常' },
                  { name: 'The Verge AI', status: '正常' },
                  { name: 'OpenAI Blog', status: '正常' },
                  { name: 'Google AI Blog', status: '正常' },
                  { name: 'Hacker News', status: '正常' },
                  { name: 'Product Hunt', status: '正常' },
                  { name: 'The Gradient', status: '正常' },
                  { name: 'Ahead of AI', status: '正常' },
                  { name: 'Last Week in AI', status: '正常' },
                ].map((source) => (
                  <div key={source.name} className="flex items-center justify-between">
                    <span className="text-cyber-muted-foreground text-sm">{source.name}</span>
                    <span className={`text-xs px-2 py-0.5 font-mono border ${source.status === '正常' ? 'border-neon-green text-neon-green bg-neon-green/10' : 'border-yellow-500 text-yellow-500 bg-yellow-500/10'}`}
                      style={{
                        clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))'
                      }}
                    >
                      {source.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-cyber-border bg-cyber-muted/30">
                <p className="text-xs text-cyber-muted-foreground font-mono">
                  {'>'} 每小时自动更新<br/>
                  {'>'} 上次: {formatDate(new Date())}
                </p>
              </div>
            </div>

            {/* Subscribe - Holographic Style */}
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
    '#00d4ff', '#00ff88', '#ff00ff', '#ff6b6b', '#ffd93d',
    '#6bcf7f', '#4ecdc4', '#ff6b9d', '#c7ceea', '#95e1d3'
  ]
  return colors[Math.abs(hash) % colors.length]
}

// 订阅卡片组件
function SubscribeCard() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.alreadySubscribed ? '该邮箱已订阅' : data.message)
        if (!data.alreadySubscribed) setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || '订阅失败')
      }
    } catch {
      setStatus('error')
      setMessage('网络错误，请稍后重试')
    }
  }

  return (
    <div 
      className="relative overflow-hidden"
      style={{
        clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))'
      }}
    >
      {/* Holographic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-neon-magenta/10 to-neon-cyan/20" />
      <div className="absolute inset-0 backdrop-blur-sm bg-cyber-card/80" />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-cyan" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-cyan" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-magenta" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-magenta" />
      
      <div className="relative p-6">
        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neon-green/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-neon-green" />
            </div>
            <h3 className="font-orbitron font-semibold text-neon-green mb-1">订阅成功！</h3>
            <p className="text-cyber-muted-foreground text-sm font-mono">{message}</p>
            <button 
              onClick={() => { setStatus('idle'); setEmail(''); setMessage('') }}
              className="mt-3 text-xs text-neon-cyan hover:underline font-mono"
            >
              继续订阅其他邮箱
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-orbitron font-semibold text-cyber-foreground mb-2">订阅AI周刊</h3>
            <p className="text-cyber-muted-foreground text-sm mb-4 font-mono">每周精选AI行业动态，直达邮箱</p>
            <form onSubmit={handleSubmit}>
              <div className="relative mb-3">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-cyan" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); status === 'error' && setStatus('idle') }}
                  placeholder="输入邮箱地址"
                  required
                  disabled={status === 'loading'}
                  className="w-full pl-9 pr-4 py-2.5 bg-cyber-background border border-cyber-border rounded-lg text-cyber-foreground placeholder:text-cyber-muted-foreground focus:border-neon-cyan focus:outline-none transition-colors font-mono text-sm disabled:opacity-50"
                />
              </div>
              {status === 'error' && (
                <p className="text-neon-red text-xs mb-2 font-mono">{message}</p>
              )}
              <button 
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2.5 bg-neon-green/20 text-neon-green border border-neon-green/50 rounded-lg font-mono uppercase tracking-wider text-sm hover:bg-neon-green hover:text-cyber-background hover:border-neon-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    订阅中...
                  </>
                ) : '订阅'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
