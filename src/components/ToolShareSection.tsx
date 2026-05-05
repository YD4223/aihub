'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Link2, Check, MessageCircle, ThumbsUp, Share2,
  Copy, MoreHorizontal, Send, Image as ImageIcon, Smile,
  Search, TrendingUp, Clock, Filter, XCircle,
  ChevronDown, Trash2, Heart, Loader2, AlertCircle, Zap
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
  user: { id: number; username: string; avatarUrl: string | null }
  replies?: ShareComment[]
  _count?: { replies: number }
}

type SortType = 'hot' | 'new'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🤔', '👌', '🙏']
const HOT_TOPICS = ['#使用体验', '#功能建议', '#同类对比', '#价格讨论', '#技术原理']

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1']
  return colors[Math.abs(hash) % colors.length]
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 判断是否是 AI 助手（使用宽松匹配，去除空格）
function isAIUser(username: string): boolean {
  return username?.trim() === 'AI助手'
}

export default function ToolShareSection({ toolId, toolName, toolSlug, toolDesc }: ToolShareSectionProps) {
  const [toolUrl, setToolUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'share' | 'discuss'>('share')
  const [copied, setCopied] = useState(false)

  // 发布分享状态
  const [shareContent, setShareContent] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setToolUrl(`${window.location.origin}/tools/${toolSlug}`)
  }, [toolSlug])

  // 加载评论
  const loadComments = async (page = 1, reset = false) => {
    setCommentsLoading(true)
    try {
      // 使用工具评论 API
      const res = await fetch(`/api/tools/${toolId}/comments?page=${page}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        // 转换格式
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
              avatarUrl: isAI ? '/avatars/ai-lobster.svg' : c.userAvatarUrl
            }
          }
        })
        setComments(reset ? formattedComments : prev => [...prev, ...formattedComments])
        setCommentsTotal(data.total || 0)
        setCommentPage(page)
      }
    } catch {
      // 网络失败静默处理
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'discuss') {
      loadComments(1, true)
    }
  }, [activeTab, sortBy, toolId])

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(toolUrl)
    } catch {
      const input = document.createElement('input')
      input.value = toolUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 添加表情
  const addEmoji = (emoji: string) => {
    setShareContent(prev => prev + emoji)
    setShowEmoji(false)
    textareaRef.current?.focus()
  }

  // 添加话题
  const addTopic = (topic: string) => {
    setShareContent(prev => prev + ' ' + topic + ' ')
    textareaRef.current?.focus()
  }

  // 图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).slice(0, 4 - uploadedImages.length).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImages(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    Array.from(files).filter(f => f.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImages(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  // 发布分享
  const submitShare = async () => {
    if (!shareContent.trim()) return
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      setSubmitError('请先登录后再发布分享')
      return
    }
    const user = JSON.parse(userStr)
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: shareContent,
          toolId,
          userId: user.id,
          images: uploadedImages.length > 0 ? uploadedImages : undefined
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || `发布失败 (${res.status})`)
      } else {
        setSubmitSuccess(true)
        setShareContent('')
        setUploadedImages([])
        setTimeout(() => setSubmitSuccess(false), 4000)
      }
    } catch (err: any) {
      setSubmitError('网络错误: ' + (err.message || '请稍后重试'))
    } finally {
      setIsSubmitting(false)
    }
  }

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
      // 使用工具评论 API
      const res = await fetch(`/api/tools/${toolId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentInput, userId: user.id })
      })
      const data = await res.json()
      console.log('提交评论响应:', res.status, data)
      if (res.ok && data.comment) {
        const newComment: ShareComment = {
          id: data.comment.id,
          content: data.comment.content,
          likes: 0,
          createdAt: data.comment.createdAt,
          user: {
            id: data.comment.userId,
            username: data.comment.userName || '匿名用户',
            avatarUrl: data.comment.userAvatarUrl
          }
        }
        setComments(prev => [newComment, ...prev])
        setCommentsTotal(prev => prev + 1)
        setCommentInput('')
      }
    } catch (error) {
      console.error('发表评论失败:', error)
      alert('发表评论失败: ' + (error instanceof Error ? error.message : '请稍后重试'))
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
    <div className="bg-cyber-card border border-cyber-border mt-6 relative"
      style={{ clipPath: 'polygon(0 16px, 16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px))' }}>
      {/* 四角装饰 */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-cyan" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-cyan" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-cyan" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-cyan" />
      
      {/* 标签切换 */}
      <div className="flex border-b border-cyber-border">
        {[
          { id: 'share', label: '分享', icon: Share2 },
          { id: 'discuss', label: '讨论', icon: MessageCircle, count: commentsTotal }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'share' | 'discuss')}
            className={`flex-1 py-4 text-center font-medium transition-colors relative font-orbitron ${
              activeTab === tab.id ? 'text-neon-cyan' : 'text-cyber-muted-foreground hover:text-cyber-foreground'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-neon-cyan/20 text-neon-cyan text-xs px-2 py-0.5 font-mono"
                  style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                  {tab.count}
                </span>
              )}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan shadow-neon-cyan" />
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* 分享 Tab */}
        {activeTab === 'share' && (
          <div className="space-y-5">
            {/* 复制链接 */}
            <div className="bg-cyber-muted/20 border border-cyber-border p-4 relative"
              style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
              <p className="text-sm text-cyber-muted-foreground mb-3 font-mono">{'>'} 复制链接分享给朋友</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-cyber-background border border-cyber-border px-4 py-2.5 overflow-hidden"
                  style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                  <span className="text-cyber-muted-foreground text-sm font-mono block overflow-x-auto whitespace-nowrap">
                    {toolUrl}
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-2 px-5 py-2.5 font-medium transition-all flex-shrink-0 font-orbitron ${
                    copied ? 'bg-neon-green text-cyber-background' : 'bg-neon-cyan text-cyber-background hover:shadow-neon-cyan'
                  }`}
                  style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>

            {/* 发布分享区 */}
            <div>
              <h3 className="font-medium text-cyber-foreground mb-3 font-orbitron flex items-center gap-2">
                <span className="text-neon-magenta">{'>'}</span> 分享你的使用体验
              </h3>

              {submitSuccess && (
                <div className="flex items-center gap-2 bg-neon-green/10 border border-neon-green/30 text-neon-green px-4 py-3 mb-3 font-mono"
                  style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">发布成功！内容审核通过后将会显示在分享广场 🎉</span>
                </div>
              )}
              {submitError && (
                <div className="flex items-center gap-2 bg-neon-red/10 border border-neon-red/30 text-neon-red px-4 py-3 mb-3 font-mono"
                  style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{submitError}</span>
                </div>
              )}

              <div
                className={`relative border-2 transition-colors ${
                  isDragging ? 'border-neon-cyan bg-neon-cyan/5' : 'border-cyber-border'
                }`}
                style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <textarea
                  ref={textareaRef}
                  value={shareContent}
                  onChange={e => setShareContent(e.target.value)}
                  placeholder={`分享你对 ${toolName} 的使用心得、技巧或建议...`}
                  className="w-full h-28 p-4 bg-transparent resize-none focus:outline-none text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground"
                  maxLength={500}
                />
                <div className="px-4 pb-1 text-right">
                  <span className={`text-xs font-mono ${shareContent.length > 450 ? 'text-neon-magenta' : 'text-cyber-muted-foreground'}`}>
                    {shareContent.length}/500
                  </span>
                </div>

                {/* 图片预览 */}
                {uploadedImages.length > 0 && (
                  <div className="flex gap-2 px-4 pb-3 flex-wrap">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} alt="" className="w-20 h-20 object-cover"
                          style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }} />
                        <button
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-neon-red text-white flex items-center justify-center text-xs"
                          style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 工具栏 */}
                <div className="px-4 pb-3 border-t border-cyber-border pt-3 space-y-2">
                  {/* 热门话题 - 放在上面 */}
                  <div className="flex gap-1.5 overflow-x-auto">
                    {HOT_TOPICS.slice(0, 3).map(topic => (
                      <button
                        key={topic}
                        onClick={() => addTopic(topic)}
                        className="px-2 py-1 bg-neon-cyan/10 text-neon-cyan text-[11px] whitespace-nowrap hover:bg-neon-cyan/20 transition-colors font-mono flex-shrink-0"
                        style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                  {/* 操作按钮和发布 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Emoji clicked in ToolShareSection')
                          setShowEmoji(prev => !prev)
                        }}
                        className="p-2 text-cyber-muted-foreground hover:bg-cyber-muted/30 transition-colors rounded"
                        title="表情"
                      >
                        <Smile className="w-4 h-4 pointer-events-none" />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadedImages.length >= 4}
                        className="p-2 text-cyber-muted-foreground hover:bg-cyber-muted/30 transition-colors disabled:opacity-40"
                        style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                        title="图片（最多4张）"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </div>
                    <button
                      onClick={submitShare}
                      disabled={!shareContent.trim() || isSubmitting}
                      className="flex items-center gap-2 px-5 py-2 bg-neon-cyan text-cyber-background font-orbitron font-medium hover:shadow-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                      style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isSubmitting ? '发布中...' : '发布'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 表情选择器 - 移出 clipPath 容器 */}
              {showEmoji && (
                <div className="absolute left-4 bottom-16 bg-cyber-card border border-cyber-border p-3 z-50 rounded-lg shadow-lg"
                  style={{ minWidth: '200px' }}>
                  <div className="grid grid-cols-6 gap-2">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-10 h-10 text-xl hover:bg-cyber-muted/30 transition-colors rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-cyber-muted-foreground mt-2 font-mono">分享将经过审核后展示在分享广场</p>
            </div>
          </div>
        )}

        {/* 讨论 Tab */}
        {activeTab === 'discuss' && (
          <div className="space-y-5">
            {/* 评论输入 */}
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  ref={commentRef}
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  placeholder="分享你的看法..."
                  className="w-full h-20 p-3 bg-[#1a1a2e] border border-cyber-border resize-none focus:outline-none focus:border-neon-cyan text-sm text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground/50"
                  style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={submitComment}
                    disabled={!commentInput.trim() || commentSubmitting}
                    className="flex items-center gap-2 px-5 py-2 bg-neon-cyan text-cyber-background text-sm font-orbitron font-medium hover:shadow-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    发表
                  </button>
                </div>
              </div>
            </div>

            {/* 列表头部：排序 + 搜索 */}
            <div className="flex items-center justify-between border-b border-cyber-border pb-3">
              <div className="flex items-center gap-3">
                <span className="font-medium text-cyber-foreground text-sm font-orbitron">
                  {'>'} 全部讨论 {commentsTotal > 0 && `(${commentsTotal})`}
                </span>
                <div className="relative group">
                  <button className="flex items-center gap-1 text-sm text-cyber-muted-foreground hover:text-cyber-foreground font-mono">
                    <Filter className="w-4 h-4" />
                    {sortBy === 'new' ? '最新' : '热门'}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-cyber-card border border-cyber-border py-1 hidden group-hover:block min-w-[100px] z-10"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                    {([['new', '最新', Clock], ['hot', '热门', TrendingUp]] as const).map(([val, label, Icon]) => (
                      <button
                        key={val}
                        onClick={() => setSortBy(val)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-cyber-muted/30 flex items-center gap-2 font-mono ${sortBy === val ? 'text-neon-cyan' : 'text-cyber-foreground'}`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showSearch ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="搜索评论..."
                      className="w-40 px-3 py-1.5 bg-[#1a1a2e] border border-cyber-border text-sm text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground/50 focus:outline-none focus:border-neon-cyan"
                      style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                      autoFocus
                    />
                    <button
                      onClick={() => { setShowSearch(false); setSearchQuery('') }}
                      className="p-1 text-cyber-muted-foreground hover:text-neon-red"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSearch(true)}
                    className="p-2 text-cyber-muted-foreground hover:text-cyber-foreground hover:bg-cyber-muted/30 transition-colors"
                    style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 评论列表 */}
            {commentsLoading && comments.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-12 text-cyber-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-mono">暂无讨论，来发表第一条吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComments.map(item => (
                  <div key={item.id} className="flex gap-3 pb-4 border-b border-cyber-border last:border-0">
                    {item.user.avatarUrl === '/avatars/ai-lobster.svg' ? (
                      // AI 助手专属头像
                      <div
                        className="w-9 h-9 flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                      >
                        <img src="/avatars/ai-lobster.svg" alt="AI" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className="w-9 h-9 flex items-center justify-center text-cyber-background text-sm font-bold flex-shrink-0 font-orbitron"
                        style={{ background: stringToColor(item.user.username), clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                      >
                        {item.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.user.avatarUrl === '/avatars/ai-lobster.svg' ? (
                          // AI 助手专属名称标签
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium font-orbitron text-transparent bg-clip-text"
                            style={{
                              backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                              textShadow: 'none',
                              filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))'
                            }}>
                            <Zap className="w-3 h-3 text-purple-400" />
                            <span style={{ color: '#c084fc' }}>{item.user.username}</span>
                          </span>
                        ) : (
                          <span className="font-medium text-cyber-foreground text-sm font-orbitron">{item.user.username}</span>
                        )}
                        <span className="text-xs text-cyber-muted-foreground font-mono">{timeAgo(item.createdAt)}</span>
                      </div>
                      <p className="text-cyber-muted-foreground text-sm whitespace-pre-wrap font-mono">{item.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => {
                            setLikedComments(prev => {
                              const next = new Set(prev)
                              next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                              return next
                            })
                          }}
                          className={`flex items-center gap-1 text-sm transition-colors font-mono ${
                            likedComments.has(item.id) ? 'text-neon-magenta' : 'text-cyber-muted-foreground hover:text-cyber-foreground'
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${likedComments.has(item.id) ? 'fill-current' : ''}`} />
                          {(item.likes + (likedComments.has(item.id) ? 1 : 0)) > 0 &&
                            (item.likes + (likedComments.has(item.id) ? 1 : 0))}
                        </button>
                        <button className="text-sm text-cyber-muted-foreground hover:text-neon-cyan font-mono">回复</button>
                      </div>

                      {/* 子回复 */}
                      {item.replies && item.replies.length > 0 && (
                        <div className="mt-3 bg-cyber-muted/20 border border-cyber-border p-3 space-y-2"
                          style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
                          {item.replies.map(reply => (
                            <div key={reply.id} className="flex gap-2">
                              {reply.user.avatarUrl === '/avatars/ai-lobster.svg' ? (
                                <div
                                  className="w-7 h-7 flex items-center justify-center flex-shrink-0 overflow-hidden"
                                  style={{ clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))' }}
                                >
                                  <img src="/avatars/ai-lobster.svg" alt="AI" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div
                                  className="w-7 h-7 flex items-center justify-center text-cyber-background text-xs font-bold flex-shrink-0 font-orbitron"
                                  style={{ background: stringToColor(reply.user.username), clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))' }}
                                >
                                  {reply.user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                {reply.user.avatarUrl === '/avatars/ai-lobster.svg' ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 text-xs font-medium font-orbitron"
                                      style={{ color: '#c084fc' }}>
                                      <Zap className="w-3 h-3 text-purple-400" />
                                      {reply.user.username}
                                    </span>
                                    <span className="text-sm text-cyber-muted-foreground font-mono ml-1">{reply.content}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm font-medium text-cyber-foreground font-orbitron">{reply.user.username} </span>
                                    <span className="text-sm text-cyber-muted-foreground font-mono">{reply.content}</span>
                                  </>
                                )}
                                <div className="text-xs text-cyber-muted-foreground mt-0.5 font-mono">{timeAgo(reply.createdAt)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 加载更多 */}
                {comments.length < commentsTotal && (
                  <button
                    onClick={() => loadComments(commentPage + 1)}
                    disabled={commentsLoading}
                    className="w-full py-3 text-sm text-neon-cyan hover:bg-neon-cyan/10 transition-colors disabled:opacity-50 font-mono"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    {commentsLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '加载更多'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
