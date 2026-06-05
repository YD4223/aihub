'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Heart, MessageCircle } from 'lucide-react'

interface Comment {
  id: number
  content: string
  userId: number
  userName: string
  userRole: string
  likes: number
  isLiked: boolean
  createdAt: string
}

interface Props {
  shareId: number
  shareType: string
}

export default function ShareDetailClient({ shareId, shareType }: Props) {
  const [user, setUser] = useState<any>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 加载用户信息
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setUser(JSON.parse(userStr)) } catch {}
    }
  }, [])

  // 加载评论
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/shares/${shareId}/comments`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch (e) {
      console.error('加载评论失败:', e)
    } finally {
      setLoading(false)
    }
  }, [shareId])

  useEffect(() => { loadComments() }, [loadComments])

  // 提交评论
  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/shares/${shareId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content: newComment.trim(), parentId: null }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setNewComment('')
      await loadComments()
    } catch {
      setError('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 点赞评论
  const handleLikeComment = async (commentId: number) => {
    if (!user) return
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.error) return
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, isLiked: data.liked, likes: data.likes } : c
      ))
    } catch {}
  }

  const canComment = user !== null

  return (
    <div className="bg-cyber-card border border-cyber-border clip-chamfer overflow-hidden">
      {/* 评论区标题 */}
      <div className="px-4 sm:px-6 py-4 border-b border-cyber-border">
        <h3 className="text-sm font-mono font-bold text-cyber-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-neon-cyan" />
          评论 ({comments.length})
        </h3>
      </div>

      {/* 评论列表 */}
      <div className="divide-y divide-cyber-border max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-neon-green" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-sm text-cyber-muted-foreground font-mono">
            还没有评论，来说点什么吧
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="px-4 sm:px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex-shrink-0 flex items-center justify-center text-neon-cyan font-bold font-mono text-xs">
                  {comment.userName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-cyber-foreground">
                      {comment.userName}
                    </span>
                    {comment.userRole === 'ADMIN' && (
                      <span className="px-1 text-[10px] font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 clip-chamfer-sm">
                        站长
                      </span>
                    )}
                    <span className="text-[10px] text-cyber-muted-foreground font-mono">
                      {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-cyber-foreground/80 font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className={`mt-2 flex items-center gap-1 text-xs font-mono transition-colors ${
                      comment.isLiked
                        ? 'text-neon-magenta'
                        : 'text-cyber-muted-foreground hover:text-neon-magenta'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-neon-magenta' : ''}`} />
                    {comment.likes}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 评论输入框 */}
      <div className="px-4 sm:px-6 py-4 border-t border-cyber-border">
        {canComment ? (
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="写下你的评论..."
              className="flex-1 px-4 py-2.5 bg-cyber-background border border-cyber-border text-sm font-mono text-cyber-foreground rounded-lg focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green/30"
              maxLength={500}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2.5 bg-neon-green text-cyber-background font-mono font-bold text-sm rounded-lg hover:bg-neon-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              发送
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-cyber-muted-foreground font-mono">
            <a href="/login" className="text-neon-green hover:underline">登录</a> 后即可评论
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-neon-magenta font-mono">{error}</p>
        )}
      </div>
    </div>
  )
}
