'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import {
  Bell, Heart, MessageCircle, UserPlus, Info,
  Check, CheckCheck, ArrowLeft, Loader2, Trash2,
  Terminal, Clock, ChevronLeft, ChevronRight
} from 'lucide-react'

interface NotificationItem {
  id: number
  userId: number
  type: 'like' | 'comment' | 'follow' | 'system'
  title: string
  content: string | null
  link: string | null
  relatedUserId: number | null
  isRead: boolean
  createdAt: string
}

const PAGE_SIZE = 20

const TYPE_CONFIG: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  like:    { icon: Heart,        color: '#ff3366',   bg: 'rgba(255,51,102,0.1)' },
  comment: { icon: MessageCircle, color: '#00d4ff',   bg: 'rgba(0,212,255,0.1)'  },
  follow:  { icon: UserPlus,      color: '#00ff88',   bg: 'rgba(0,255,136,0.1)'  },
  system:  { icon: Info,          color: '#f59e0b',   bg: 'rgba(245,158,11,0.1)' },
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: number; username: string } | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<number | null>(null)

  // 获取登录用户
  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  // 获取通知列表
  const fetchNotifications = useCallback(async (p: number) => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}&page=${p}&pageSize=${PAGE_SIZE}`)
      const data = await res.json()
      if (data.notifications) {
        setNotifications(data.notifications)
        setTotal(data.total || 0)
      }
    } catch (e) {
      console.error('获取通知失败:', e)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) fetchNotifications(page)
  }, [user?.id, page, fetchNotifications])

  // 标记单条已读
  const handleMarkRead = async (id: number) => {
    if (!user?.id) return
    setMarking(id)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, userId: user.id }),
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch (e) {
      console.error('标记已读失败:', e)
    } finally {
      setMarking(null)
    }
  }

  // 全部标记已读
  const handleMarkAllRead = async () => {
    if (!user?.id) return
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (e) {
      console.error('全部标记已读失败:', e)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (!user) {
    return (
      <div className="min-h-screen bg-cyber-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-32 pb-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-neon-magenta clip-chamfer">
            <Bell className="w-10 h-10 text-neon-magenta" />
          </div>
          <p className="text-cyber-foreground text-lg mb-2 font-orbitron">请先登录</p>
          <p className="text-sm text-cyber-muted-foreground font-mono mb-6">
            登录后即可查看通知
          </p>
          <Link href="/login" className="btn-cyber px-6 py-3">
            去登录
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 border border-cyber-border text-cyber-foreground hover:text-neon-green hover:border-neon-green transition-all"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-orbitron font-black text-cyber-foreground uppercase tracking-wider">
                <span className="text-neon-green">#</span> 通知
              </h1>
              <p className="text-sm text-cyber-muted-foreground font-mono mt-1">
                <Terminal className="w-3 h-3 inline mr-1" />
                共 {total} 条通知 · 未读 {notifications.filter(n => !n.isRead).length} 条
              </p>
            </div>
          </div>

          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-mono border border-cyber-border text-cyber-foreground hover:text-neon-green hover:border-neon-green transition-all"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </button>
          )}
        </div>

        {/* 通知列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neon-green animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-cyber-card border border-cyber-border clip-chamfer">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-neon-green/30 clip-chamfer-sm bg-neon-green/5">
              <Bell className="w-8 h-8 text-neon-green" />
            </div>
            <p className="text-cyber-foreground text-lg mb-2 font-orbitron">暂无通知</p>
            <p className="text-sm text-cyber-muted-foreground font-mono">
              当有人与你互动时，通知会出现在这里
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
              const Icon = cfg.icon

              return (
                <div
                  key={n.id}
                  className={`group relative flex items-start gap-4 p-4 border transition-all duration-200 ${
                    n.isRead
                      ? 'bg-cyber-card/50 border-cyber-border/50'
                      : 'bg-cyber-card border-neon-green/30 shadow-[inset_0_0_15px_rgba(0,255,136,0.05)]'
                  }`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                >
                  {/* 未读指示器 */}
                  {!n.isRead && (
                    <span className="absolute top-4 left-4 w-2 h-2 bg-neon-green rounded-full animate-pulse" style={{ boxShadow: '0 0 6px #00ff88' }} />
                  )}

                  {/* 图标 */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center ${
                      n.isRead ? 'opacity-50' : ''
                    }`}
                    style={{
                      background: cfg.bg,
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-mono ${n.isRead ? 'text-cyber-muted-foreground' : 'text-cyber-foreground font-bold'}`}>
                          {n.title}
                        </p>
                        {n.content && (
                          <p className="text-xs text-cyber-muted-foreground mt-1 font-mono line-clamp-2">
                            {n.content}
                          </p>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            disabled={marking === n.id}
                            className="p-1.5 text-cyber-muted-foreground hover:text-neon-green hover:bg-neon-green/10 transition-all opacity-0 group-hover:opacity-100"
                            title="标记已读"
                          >
                            {marking === n.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* footer */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-cyber-muted-foreground font-mono">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.createdAt)}
                      </span>
                      {n.link && !n.isRead && (
                        <Link
                          href={n.link}
                          className="text-[10px] font-mono text-neon-cyan hover:text-neon-green underline-offset-2 hover:underline transition-colors"
                          onClick={() => handleMarkRead(n.id)}
                        >
                          查看详情 →
                        </Link>
                      )}
                      {n.link && n.isRead && (
                        <Link
                          href={n.link}
                          className="text-[10px] font-mono text-cyber-muted-foreground hover:text-neon-green underline-offset-2 hover:underline transition-colors"
                        >
                          查看详情 →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 border border-cyber-border text-cyber-foreground hover:text-neon-green hover:border-neon-green transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-mono text-cyber-muted-foreground">
              <span className="text-neon-green">{page}</span> / {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 border border-cyber-border text-cyber-foreground hover:text-neon-green hover:border-neon-green transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
