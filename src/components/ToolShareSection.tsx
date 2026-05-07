'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  MessageCircle, Search, Clock, Loader2, Send, Zap, ChevronUp, ChevronDown
} from 'lucide-react'

interface ToolShareSectionProps {
  toolId: number
  toolName: string
  toolSlug: string
  toolDesc: string
}

interface ShareComment {
  id: number
  content: string
  likes: number
  createdAt: string
  user: { id: number; username: string; avatarUrl: string | null; role?: string }
  replies?: ShareComment[]
  _count?: { replies: number }
}

type SortType = 'hot' | 'new'

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 判断是否是 AI 助手
function isAIUser(username: string): boolean {
  return username?.trim() === 'AI助手'
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1']
  return colors[Math.abs(hash) % colors.length]
}

export default function ToolShareSection({ toolId, toolName }: ToolShareSectionProps) {
  // 评论状态
  const [comments, setComments] = useState<ShareComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentPage, setCommentPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortType>('new')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [showAllComments, setShowAllComments] = useState(false)

  const commentRef = useRef<HTMLTextAreaElement>(null)

  // 加载评论
  const loadComments = async (page = 1, reset = false) => {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/tools/${toolId}/comments?page=${page}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        const formattedComments = (data.comments || []).map((c: any) => {
          const isAI = c.userName?.trim() === 'AI助手'
          return {
            id: c.id,
            content: c.content,
            likes: 0,
            createdAt: c.createdAt,
            user: {
              id: c.userId,
              username: c.userName || '匿名用户',
              avatarUrl: isAI ? '/avatars/ai-lobster.svg' : c.userAvatarUrl,
              role: c.userRole
            }
          }
        })
        setComments(reset ? formattedComments : prev => [...prev, ...formattedComments])
        setCommentsTotal(data.total || 0)
        setCommentPage(page)
      }
    } catch {
      // 静默失败
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    loadComments(1, true)
  }, [sortBy, toolId])

  // 发表评论
  const submitComment = async () => {
    if (!commentInput.trim()) return
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      alert('请先登录后再发表评论')
      return
    }
    const user = JSON.parse(userStr)
    setCommentSubmitting(true)
    try {
      const res = await fetch(`/api/tools/${toolId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentInput, userId: user.id })
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      if (res.ok && data.comment) {
        const newComment: ShareComment = {
          id: data.comment.id,
          content: data.comment.content,
          likes: 0,
          createdAt: data.comment.createdAt,
          user: {
            id: data.comment.userId,
            username: data.comment.userName || '匿名用户',
            avatarUrl: data.comment.userAvatarUrl,
            role: data.comment.userRole
          }
        }
        setComments(prev => [newComment, ...prev])
        setCommentsTotal(prev => prev + 1)
        setCommentInput('')
      }
    } catch (error) {
      console.error('发表评论失败:', error)
    } finally {
      setCommentSubmitting(false)
    }
  }

  // 过滤评论（本地搜索）
  const filteredComments = searchQuery
    ? comments.filter(c =>
        c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : comments

  return (
    <div id="share-section" className="bg-cyber-card border border-cyber-border mt-6 relative"
      style={{ clipPath: 'polygon(0 16px, 16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px))' }}>
      {/* 四角装饰 */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-cyan" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-cyan" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-cyan" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-cyan" />

      {/* 标题 — 可折叠 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between border-b border-cyber-border px-6 py-4 hover:bg-cyber-muted/10 transition-colors"
      >
        <h2 className="text-xl font-bold text-cyber-foreground font-orbitron flex items-center gap-2">
          <span className="text-neon-cyan">{'>'}</span> 讨论区
          {commentsTotal > 0 && (
            <span className="bg-neon-cyan/20 text-neon-cyan text-xs px-2 py-0.5 font-mono ml-2"
              style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}>
              {commentsTotal}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {/* 排序 */}
              <div className="flex bg-cyber-background border border-cyber-border p-0.5"
                style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                <button
                  onClick={() => setSortBy('new')}
                  className={`px-3 py-1.5 text-xs font-mono transition-colors flex items-center gap-1 ${
                    sortBy === 'new' ? 'bg-neon-cyan text-cyber-background' : 'text-cyber-muted-foreground hover:text-cyber-foreground'
                  }`}
                  style={{ clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))' }}
                >
                  <Clock className="w-3 h-3" /> 最新
                </button>
              </div>
              {/* 搜索 */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 text-cyber-muted-foreground hover:text-neon-cyan transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}
          {collapsed ? <ChevronDown className="w-5 h-5 text-cyber-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-cyber-muted-foreground" />}
        </div>
      </button>

      {/* 折叠内容 */}
      {!collapsed && (
      <div className="p-6">
        {/* 搜索框 */}
        {showSearch && (
          <div className="mb-4">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索评论..."
              className="w-full px-4 py-2 bg-cyber-background border border-cyber-border text-cyber-foreground font-mono text-sm focus:outline-none focus:border-neon-cyan"
              style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
            />
          </div>
        )}

        {/* 评论输入 */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <textarea
              ref={commentRef}
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              placeholder={`分享你对 ${toolName} 的看法...`}
              className="w-full h-20 p-3 bg-[#1a1a2e] border border-cyber-border resize-none focus:outline-none focus:border-neon-cyan text-sm text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground/50"
              style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={submitComment}
                disabled={!commentInput.trim() || commentSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-neon-cyan text-cyber-background font-orbitron font-medium text-sm hover:shadow-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {commentSubmitting ? '发表中...' : '发表'}
              </button>
            </div>
          </div>
        </div>

        {/* 评论列表 — 固定高度可滚动 */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a3a transparent' }}>
          {commentsLoading && comments.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neon-cyan mx-auto mb-2" />
              <p className="text-sm text-cyber-muted-foreground font-mono">加载中...</p>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-8 h-8 text-cyber-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-cyber-muted-foreground font-mono">
                {searchQuery ? '没有匹配的评论' : '暂无评论，来聊聊你的看法吧'}
              </p>
            </div>
          ) : (
            <>
              {filteredComments.slice(0, showAllComments ? undefined : 5).map(comment => {
                const isLong = comment.content.length > 100
                const isExpanded = expandedComments.has(comment.id)
                return (
                <div key={comment.id} className="flex gap-3 p-4 bg-cyber-muted/10 border border-cyber-border"
                  style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                  {/* 头像 */}
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-neon-cyan/30"
                    style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                    {comment.user.avatarUrl ? (
                      <img src={comment.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold font-orbitron" style={{ color: stringToColor(comment.user.username) }}>
                        {comment.user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-cyber-foreground font-mono">{comment.user.username}</span>
                      {comment.user.role === 'ADMIN' && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold font-mono"
                          style={{ clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))' }}>
                          👑 站长
                        </span>
                      )}
                      {isAIUser(comment.user.username) && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-gradient-to-r from-neon-cyan to-neon-magenta text-cyber-background font-bold font-mono"
                          style={{ clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))' }}>
                          <Zap className="w-3 h-3 inline" /> AI
                        </span>
                      )}
                      <span className="text-xs text-cyber-muted-foreground font-mono">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <div className="mt-1">
                      <p className={`text-sm text-cyber-muted-foreground font-mono ${isLong && !isExpanded ? 'line-clamp-3' : ''}`}>
                        {comment.content}
                      </p>
                      {isLong && (
                        <button
                          onClick={() => setExpandedComments(prev => {
                            const next = new Set(prev)
                            isExpanded ? next.delete(comment.id) : next.add(comment.id)
                            return next
                          })}
                          className="text-xs text-neon-cyan hover:text-neon-magenta font-mono mt-1 transition-colors"
                        >
                          {isExpanded ? '收起' : '展开全部'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )})}
              {/* 折叠控制：默认只显示前5条 */}
              {!showAllComments && filteredComments.length > 5 && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setShowAllComments(true)}
                    className="text-sm text-neon-cyan hover:text-neon-magenta font-mono transition-colors border border-cyber-border px-6 py-2 bg-cyber-muted/10"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    查看全部 {filteredComments.length} 条评论 ↓
                  </button>
                </div>
              )}
              {showAllComments && filteredComments.length > 5 && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setShowAllComments(false)}
                    className="text-sm text-neon-cyan hover:text-neon-magenta font-mono transition-colors"
                  >
                    收起 ↑
                  </button>
                </div>
              )}
              {/* 加载更多 — 点击后自动展开全部 */}
              {comments.length < commentsTotal && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => { loadComments(commentPage + 1); setShowAllComments(true) }}
                    disabled={commentsLoading}
                    className="text-sm text-neon-cyan hover:text-neon-magenta font-mono transition-colors"
                  >
                    {commentsLoading ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
