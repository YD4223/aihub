'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { 
  Heart, MessageCircle, Share2, Send, MoreHorizontal,
  Smile, Image as ImageIcon, AtSign, Hash, ThumbsUp,
  Trash2, Flag, Bookmark, Link2, Check, X,
  ChevronDown, ChevronUp, CornerDownRight, Loader2, Zap
} from 'lucide-react'
import ReportModal from './ReportModal'
import Avatar from './Avatar'

interface UserShareCardProps {
  share: {
    id: number
    content: string
    images: string | null
    video: string | null
    likes: number
    viewCount: number
    status: string
    type: string
    createdAt: Date
    tool: {
      id: number | null
      name: string
      slug: string | null
      shortDesc: string | null
      description: string | null
      websiteUrl: string | null
      githubUrl: string | null
      logoUrl: string | null
      tags: string | null
      viewCount: number
      category: { name: string; slug: string } | null
    } | null
    user: {
      id: number
      username: string
      avatarUrl: string | null
      role?: string
    }
    _count: {
      comments: number
    }
  }
}

interface Comment {
  id: number
  user: { 
    id: number
    name: string
    avatar: string
    role?: string
  }
  content: string
  time: string
  timestamp: number
  likes: number
  isLiked?: boolean
  images?: string[]
  replies?: Comment[]
  replyTo?: { id: number; name: string }
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🤔', '👌', '🙏', '💯', '✨', '📌', '😍', '🥳', '🤯', '👀', '💪']

const HOT_TOPICS = ['#使用体验', '#功能建议', '#同类对比', '#价格讨论', '#求推荐', '#踩坑分享']

// 判断是否是 AI 助手（使用宽松匹配，去除空格）
function isAIUser(name: string): boolean {
  return name?.trim() === 'AI助手'
}

export default function UserShareCard({ share }: UserShareCardProps) {
  const { tool, user } = share
  const isAdmin = user.role === 'ADMIN'
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [likeCount, setLikeCount] = useState(share.likes)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set())
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(5)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const commentsRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // 解析分享图片
  const shareImages = (() => {
    if (!share.images) return []
    if (Array.isArray(share.images)) return share.images
    try {
      const parsed = JSON.parse(share.images)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  // 格式化时间
  const [timeText, setTimeText] = useState('')
  
  const formatTime = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  useEffect(() => {
    setTimeText(formatTime(share.createdAt))
  }, [share.createdAt])

  // 从数据库加载评论 + 记录浏览
  useEffect(() => {
    if (isCommentModalOpen) {
      loadComments()
    }
    // 从服务器加载收藏/点赞状态
    const loadStatus = async () => {
      const userStr = localStorage.getItem('user')
      if (!userStr) return
      const userData = JSON.parse(userStr)
      try {
        const [favRes, likeRes] = await Promise.all([
          fetch(`/api/user/favorite-shares?userId=${userData.id}`),
          share.tool ? fetch(`/api/user/likes?userId=${userData.id}`) : Promise.resolve(null)
        ])
        if (favRes.ok) {
          const data = await favRes.json()
          setIsFavorited(data.shares?.some((s: any) => s.id === share.id) || false)
        }
        if (likeRes && likeRes.ok) {
          const data = await likeRes.json()
          setIsLiked(data.likes?.some((t: any) => t.id === share.tool!.id) || false)
        }
      } catch (e) {
        // 静默失败
      }
    }
    loadStatus()
  }, [isCommentModalOpen, share.id, share.tool])

  // 记录浏览
  useEffect(() => {
    recordView()
  }, [share.id])

  // 记录浏览
  const recordView = async () => {
    try {
      await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'share',
          targetId: share.id
        })
      })
    } catch (e) {
      // 静默失败，不影响用户体验
      console.error('记录浏览失败:', e)
    }
  }

  // 加载评论
  const loadComments = async () => {
    setIsLoadingComments(true)
    try {
      const res = await fetch(`/api/shares/${share.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        const allComments: Comment[] = []
        const replyMap = new Map<number, Comment[]>()
        
        data.comments.forEach((c: any) => {
          const isAI = c.userName?.trim() === 'AI助手'
          const comment: Comment = {
            id: c.id,
            user: { 
              id: c.userId || 0,
              name: c.userName || '匿名用户',
              role: c.userRole || c.role || undefined,
              avatar: isAI ? '/avatars/ai-lobster.svg' : (c.userAvatarUrl || '/default-avatar.png')
            },
            content: c.content,
            time: formatTime(c.createdAt),
            timestamp: new Date(c.createdAt).getTime(),
            likes: c.likes || 0,
            isLiked: false,
            replies: []
          }
          
          if (c.parentId) {
            comment.replyTo = { 
              id: c.parentId, 
              name: c.parentUserName || '未知用户' 
            }
          }
          
          allComments.push(comment)
        })
        
        const mainComments: Comment[] = []
        
        allComments.forEach(comment => {
          if (!comment.replyTo) {
            mainComments.push(comment)
          }
        })
        
        allComments.forEach(comment => {
          if (comment.replyTo) {
            const parentComment = mainComments.find(c => c.id === comment.replyTo!.id)
            
            if (parentComment) {
              if (!replyMap.has(parentComment.id)) {
                replyMap.set(parentComment.id, [])
              }
              replyMap.get(parentComment.id)!.push(comment)
            }
          }
        })
        
        mainComments.forEach(mainComment => {
          const replies = replyMap.get(mainComment.id) || []
          replies.sort((a, b) => a.timestamp - b.timestamp)
          mainComment.replies = replies
        })
        
        setComments(mainComments)
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  // 点击外部关闭分享菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

  // 点赞分享
  const handleLike = () => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再点赞，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    const user = JSON.parse(userStr)
    
    const toolId = share.tool?.id || (-1 - share.id)
    const toolData = share.tool ? {
      id: share.tool.id,
      slug: share.tool.slug,
      name: share.tool.name,
      description: share.tool.shortDesc || share.tool.description,
      iconUrl: share.tool.logoUrl,
      websiteUrl: share.tool.websiteUrl || '',
      category: share.tool.category?.name || '未分类',
    } : {
      id: toolId,
      slug: 'share-' + share.id,
      name: '分享',
      description: '',
      iconUrl: null,
      websiteUrl: '',
      category: ''
    }
    
    fetch('/api/user/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, toolId, toolData, shareId: share.id })
    }).catch(() => {})

    if (isLiked) {
      setLikeCount(prev => prev - 1)
    } else {
      setLikeCount(prev => prev + 1)
      const btn = document.getElementById(`like-btn-${share.id}`)
      btn?.classList.add('scale-125')
      setTimeout(() => btn?.classList.remove('scale-125'), 200)
    }
    setIsLiked(!isLiked)
    window.dispatchEvent(new Event('localStorageChange'))
  }

  // 收藏分享
  const handleFavorite = () => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再收藏，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    const userData = JSON.parse(userStr)
    
    const shareData = {
      id: share.id,
      content: share.content,
      images: share.images,
      createdAt: share.createdAt,
      tool: tool || null,
      user: user,
    }
    
    fetch('/api/user/favorite-shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userData.id, shareId: share.id, shareData })
    }).catch(() => {})

    setIsFavorited(!isFavorited)
    window.dispatchEvent(new Event('localStorageChange'))
  }

  // 发表评论
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const submitComment = async () => {
    if (!comment.trim() && uploadedImages.length === 0) return
    if (isSubmitting) return
    
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再发表评论，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    const currentUser = JSON.parse(userStr)
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/shares/${share.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: comment, 
          userId: currentUser.id,
          parentId: replyTo ? replyTo.id : null
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const newComment: Comment = {
          id: data.comment.id,
          user: { 
            id: currentUser.id,
            name: data.comment.userName || currentUser.username || '匿名用户', 
            avatar: data.comment.userAvatarUrl || currentUser.avatarUrl || '👤' 
          },
          content: comment,
          time: '刚刚',
          timestamp: Date.now(),
          likes: 0,
          isLiked: false,
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
          replyTo: replyTo ? { id: replyTo.id, name: data.comment.parentUserName || replyTo.name } : undefined
        }
        
        if (replyTo) {
          setComments(prev => prev.map(c => {
            if (c.id === replyTo.id) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment]
              }
            }
            return c
          }))
        } else {
          setComments(prev => [newComment, ...prev])
        }
        setVisibleCount(prev => Math.max(prev, 1))
        setComment('')
        setUploadedImages([])
        setShowEmoji(false)
        setReplyTo(null)
      }
    } catch (error) {
      console.error('发表评论失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 点赞评论
  const toggleCommentLike = async (commentId: number) => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再点赞，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    
    const currentUser = JSON.parse(userStr)
    
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })
      if (res.ok) {
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              likes: c.isLiked ? c.likes - 1 : c.likes + 1,
              isLiked: !c.isLiked
            }
          }
          return c
        }))
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  // 删除评论
  const deleteComment = async (commentId: number) => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再操作，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    
    if (!confirm('确定要删除这条评论吗？')) return
    
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('删除评论失败:', error)
    }
  }

  // 回复评论
  const handleReply = (commentItem: Comment) => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再回复，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    
    setReplyTo({ id: commentItem.id, name: commentItem.user.name })
    commentInputRef.current?.focus()
  }

  // 取消回复
  const cancelReply = () => {
    setReplyTo(null)
  }

  // 添加表情
  const addEmoji = (emoji: string) => {
    setComment(prev => prev + emoji)
    commentInputRef.current?.focus()
  }

  // 添加话题
  const addTopic = (topic: string) => {
    setComment(prev => prev + ' ' + topic + ' ')
    commentInputRef.current?.focus()
  }

  // 图片上传
  const MAX_IMAGES = 4
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    const currentCount = uploadedImages.length
    const remainingSlots = MAX_IMAGES - currentCount
    
    if (remainingSlots <= 0) {
      alert(`最多只能上传 ${MAX_IMAGES} 张图片`)
      return
    }
    
    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    
    if (files.length > remainingSlots) {
      alert(`已选择 ${files.length} 张图片，但只能再上传 ${remainingSlots} 张`)
    }
    
    filesToProcess.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImages(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  // 删除图片
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  // 复制链接
  const copyLink = async () => {
    const url = tool 
      ? `${window.location.origin}/tools/${tool.slug}`
      : `${window.location.origin}/user-share`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setShowShareMenu(false)
  }

  // 系统分享
  const systemShare = async () => {
    const url = tool 
      ? `${window.location.origin}/tools/${tool.slug}`
      : `${window.location.origin}/user-share`
    if (navigator.share) {
      try {
        await navigator.share({
          title: tool?.name || '用户分享',
          text: tool?.shortDesc || tool?.name || share.content.slice(0, 100),
          url: url
        })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url)
      alert('链接已复制到剪贴板！')
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      alert('链接已复制到剪贴板！')
    }
    setShowShareMenu(false)
  }

  // 解析标签
  const parseTags = (tags: string | null): string[] => {
    if (!tags) return []
    return tags.split(',').map(t => t.trim()).filter(Boolean)
  }

  // 切换回复展开
  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }

  // 加载更多评论
  const loadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + 5)
      setIsLoadingMore(false)
    }, 300)
  }

  const isTool = share.type === 'tool'
  const themeColor = isTool ? 'orange' : 'green'
  
  return (
    <div 
      className={`group relative bg-[#12121a] border overflow-hidden transition-all duration-300 ${
        isAdmin 
          ? 'border-[#ffd700] hover:shadow-[0_0_25px_#ffd70040]' 
          : 'border-[#2a2a3a] hover:border-[#00ff88]/50 hover:shadow-[0_0_20px_#00ff8820]'
      }`}
      style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
    >
      {/* 站长置顶标签 */}
      {isAdmin && (
        <div className="absolute -top-[1px] -right-[1px] z-10">
          <div 
            className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold font-orbitron text-black"
            style={{ 
              background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - 8px))'
            }}
          >
            ⭐ 置顶
          </div>
        </div>
      )}
      
      {/* 头部 - 分享者信息 */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          {/* 头像 - 可点击跳转到用户主页 */}
          <Avatar
            userId={user.id}
            username={user.username}
            avatarUrl={user.avatarUrl}
            size="lg"
            linkable
            showOnline
            isAI={isAIUser(user.username)}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-bold font-orbitron ${isAdmin ? 'text-[#ffd700]' : 'text-[#e0e0e0]'}`}>{user.username}</span>
              {isAdmin && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold"
                  style={{ 
                    background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                    color: '#000',
                    clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                  }}
                >
                  👑 站长
                </span>
              )}
              {/* 类型标签 */}
              <span 
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border ${
                  isTool 
                    ? 'border-[#f59e0b] text-[#f59e0b]' 
                    : 'border-[#00ff88] text-[#00ff88]'
                }`}
                style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
              >
                {isTool ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572-1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    分享了工具
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    发布了动态
                  </>
                )}
              </span>
            </div>
            <div className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-1.5 font-mono">
              <span>{timeText || new Date(share.createdAt).toLocaleDateString('zh-CN')}</span>
              <span className="w-1 h-1 bg-[#2a2a3a] rounded-full"></span>
              <span>公开</span>
            </div>
          </div>
          
          {/* 更多操作 */}
          <div className="relative" ref={shareMenuRef}>
            <button 
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="p-2 text-[#6b7280] hover:text-[#e0e0e0] hover:bg-[#1c1c2e] transition-all"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showShareMenu && (
              <div 
                className="absolute right-0 top-full mt-2 bg-[#12121a] border border-[#2a2a3a] py-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                <button
                  onClick={copyLink}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#e0e0e0] hover:bg-[#1c1c2e] transition-colors font-mono"
                >
                  {copied ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Link2 className="w-4 h-4 text-[#6b7280]" />}
                  {copied ? '已复制链接' : '复制链接'}
                </button>
                <button
                  onClick={systemShare}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#e0e0e0] hover:bg-[#1c1c2e] transition-colors font-mono"
                >
                  <Share2 className="w-4 h-4 text-[#6b7280]" />
                  分享到...
                </button>
                <button
                  onClick={handleFavorite}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#e0e0e0] hover:bg-[#1c1c2e] transition-colors font-mono"
                >
                  <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current text-[#f59e0b]' : 'text-[#6b7280]'}`} />
                  {isFavorited ? '已收藏' : '收藏'}
                </button>
                <div className="border-t border-[#2a2a3a] my-1"></div>
                <button
                  onClick={() => {
                    const userStr = localStorage.getItem('user')
                    if (!userStr) {
                      if (confirm('请先登录后再举报，是否跳转到登录页面？')) {
                        window.location.href = '/login'
                      }
                      return
                    }
                    setShowReportModal(true)
                    setShowShareMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#ff3366] hover:bg-[#ff3366]/10 transition-colors font-mono"
                >
                  <Flag className="w-4 h-4" />
                  举报内容
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 分享内容 */}
        <div className="mt-3">
          <p className="text-[#e0e0e0] text-[15px] leading-relaxed whitespace-pre-wrap font-mono">
            {share.content}
          </p>
        </div>
        
        {/* 分享图片 */}
        {shareImages.length > 0 && (
          <div className={`grid gap-1.5 mt-4 overflow-hidden ${
            shareImages.length === 1 ? 'grid-cols-1' : 
            shareImages.length === 2 ? 'grid-cols-2' : 
            'grid-cols-3'
          }`}>
            {shareImages.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative group overflow-hidden cursor-pointer ${
                  shareImages.length === 1 ? 'aspect-video' : 'aspect-square'
                }`}
                style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                onClick={() => setPreviewImage(img)}
              >
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        )}
        
        {/* 分享视频 */}
        {share.video && (
          <div className="mt-4">
            <div 
              className="relative max-w-sm overflow-hidden bg-black shadow-lg group"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
            >
              <video 
                ref={videoRef}
                src={share.video} 
                controls
                preload="metadata"
                playsInline
                className="w-full max-h-80 object-contain"
                poster={shareImages[0] || ''}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget
                  video.muted = false
                }}
              />
              {/* 视频标签 */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-[#0a0a0f]/80 backdrop-blur-sm text-[#00ff88] text-xs font-medium flex items-center gap-1 font-mono border border-[#00ff88]/30"
                style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                视频
              </div>
            </div>
          </div>
        )}
        
        {/* 关联的工具卡片 */}
        {tool && (
          <div 
            className="mt-5 p-4 bg-[#0a0a0f] border border-[#2a2a3a] hover:border-[#f59e0b]/50 transition-all duration-300 group/tool"
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
          >
            <div className="flex items-start gap-4">
              {tool.slug ? (
                <Link href={`/tools/${tool.slug}`} className="flex-shrink-0">
                  <div className="relative">
                    {/* 工具头像 - 带科技边框和发光效果 */}
                    <div 
                      className="w-14 h-14 flex items-center justify-center flex-shrink-0 text-xl font-bold text-[#0a0a0f] font-orbitron transform group-hover/tool:scale-105 transition-all duration-300 relative z-10"
                      style={{ 
                        background: `linear-gradient(135deg, ${stringToColor(tool.name)} 0%, ${adjustColor(stringToColor(tool.name), -40)} 100%)`,
                        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                        boxShadow: `0 0 0 2px ${stringToColor(tool.name)}40, 0 0 20px ${stringToColor(tool.name)}30`
                      }}
                    >
                      {tool.name.charAt(0).toUpperCase()}
                    </div>
                    {/* 角标装饰 - 科技感 */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#00d4ff] z-20" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#00d4ff] z-20" />
                  </div>
                </Link>
              ) : (
                <a 
                  href={tool.websiteUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <div className="relative">
                    {/* 工具头像 - 带科技边框和发光效果 */}
                    <div 
                      className="w-14 h-14 flex items-center justify-center flex-shrink-0 text-xl font-bold text-[#0a0a0f] font-orbitron hover:scale-105 transition-all duration-300 relative z-10"
                      style={{ 
                        background: `linear-gradient(135deg, ${stringToColor(tool.name)} 0%, ${adjustColor(stringToColor(tool.name), -40)} 100%)`,
                        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                        boxShadow: `0 0 0 2px ${stringToColor(tool.name)}40, 0 0 20px ${stringToColor(tool.name)}30`
                      }}
                    >
                      {tool.name.charAt(0).toUpperCase()}
                    </div>
                    {/* 角标装饰 - 科技感 */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#00d4ff] z-20" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#00d4ff] z-20" />
                  </div>
                </a>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {tool.slug ? (
                    <Link href={`/tools/${tool.slug}`}>
                      <h3 className="font-bold text-[#e0e0e0] hover:text-[#f59e0b] transition-colors truncate flex items-center gap-1 font-orbitron">
                        {tool.name}
                        <svg className="w-4 h-4 text-[#6b7280] opacity-0 group-hover/tool:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </h3>
                    </Link>
                  ) : (
                    <a 
                      href={tool.websiteUrl || '#'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group/link"
                    >
                      <h3 className="font-bold text-[#e0e0e0] hover:text-[#f59e0b] transition-colors truncate flex items-center gap-1 font-orbitron">
                        {tool.name}
                        <span 
                          className="ml-2 px-2 py-0.5 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] border border-[#f59e0b]/30"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                        >
                          用户提交
                        </span>
                        <svg className="w-4 h-4 text-[#6b7280] opacity-0 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </h3>
                    </a>
                  )}
                </div>
                <p className="text-sm text-[#6b7280] mt-1.5 line-clamp-2 leading-relaxed font-mono">
                  {tool.shortDesc || tool.description || '暂无描述'}
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {tool.category && (
                    <span 
                      className="px-3 py-1 bg-[#f59e0b]/10 text-[#f59e0b] text-xs font-medium border border-[#f59e0b]/30"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                    >
                      {tool.category.name}
                    </span>
                  )}
                  {parseTags(tool.tags).slice(0, 3).map(tag => (
                    <span 
                      key={tag} 
                      className="px-3 py-1 bg-[#1c1c2e] text-[#6b7280] text-xs border border-[#2a2a3a]"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 操作栏 */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-[#2a2a3a]">
        <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap">
          {/* 点赞 */}
          <button
            id={`like-btn-${share.id}`}
            onClick={handleLike}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              isLiked 
                ? 'text-[#ff3366] bg-[#ff3366]/10 border border-[#ff3366]/30' 
                : 'text-[#6b7280] hover:text-[#ff3366] hover:bg-[#ff3366]/5'
            }`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''} transition-transform ${isLiked ? 'scale-110' : ''}`} />
            <span className="text-xs sm:text-sm font-semibold font-mono">{likeCount > 0 ? likeCount : '点赞'}</span>
          </button>
          
          {/* 评论 */}
          <button
            onClick={() => setIsCommentModalOpen(true)}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 text-[#6b7280] hover:text-[#e0e0e0] hover:bg-[#1c1c2e] transition-all duration-200 whitespace-nowrap flex-shrink-0"
            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-semibold font-mono">
              {Number(share._count.comments || 0) > 0 ? share._count.comments : '评论'}
            </span>
          </button>
          
          {/* 分享 */}
          <button
            onClick={systemShare}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 text-[#6b7280] hover:text-[#e0e0e0] hover:bg-[#1c1c2e] transition-all duration-200 whitespace-nowrap flex-shrink-0"
            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-semibold font-mono">分享</span>
          </button>
        </div>
        
        {/* 浏览量 */}
        <div className="flex items-center gap-2 text-xs text-[#6b7280] font-mono">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 bg-gradient-to-br from-[#00d4ff] to-[#00ff88] border-2 border-[#12121a]"
              style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
            />
            <div className="w-5 h-5 bg-gradient-to-br from-[#ff00ff] to-[#f59e0b] border-2 border-[#12121a]"
              style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
            />
            <div className="w-5 h-5 bg-[#1c1c2e] border-2 border-[#12121a] flex items-center justify-center text-[8px] text-[#00ff88] font-bold"
              style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
            >
              +
            </div>
          </div>
          <span>{share.viewCount?.toLocaleString() || 0} 浏览</span>
        </div>
      </div>
      
      {/* 评论弹窗 */}
      {isCommentModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200"
          style={{ zIndex: 99999 }}
          onClick={() => setIsCommentModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl max-h-[85vh] bg-[#0a0a0f] border border-[#2a2a3a] flex flex-col animate-in zoom-in-95 duration-200"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-[#2a2a3a] flex items-center justify-between bg-[#12121a]/50 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-[#00ff88]" />
                <span className="text-lg font-bold text-[#e0e0e0] font-orbitron">
                  {comments.length > 0 ? `${comments.length} 条评论` : '评论'}
                </span>
              </div>
              <button 
                onClick={() => setIsCommentModalOpen(false)}
                className="p-2 hover:bg-[#1c1c2e] transition-colors"
                style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
              >
                <X className="w-5 h-5 text-[#6b7280]" />
              </button>
            </div>
            
            {/* 评论列表 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 max-h-[50vh]">
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3 text-[#6b7280]">
                  <div className="w-10 h-10 border-2 border-[#2a2a3a] border-t-[#00ff88] animate-spin"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                  />
                  <span className="text-sm font-mono">加载评论中...</span>
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-[#1c1c2e] flex items-center justify-center mx-auto mb-4"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                >
                  <MessageCircle className="w-10 h-10 text-[#2a2a3a]" />
                </div>
                <p className="text-[#6b7280] font-medium font-mono">还没有评论</p>
                <p className="text-[#2a2a3a] text-sm mt-1 font-mono">来说两句吧，分享你的想法</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.slice(0, visibleCount).map((item, index) => (
                  <div 
                    key={item.id} 
                    className="group animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* 主评论 */}
                    <div className="flex gap-3">
                      {/* 头像 */}
                      {item.user.avatar === '/avatars/ai-lobster.svg' ? (
                        <img 
                          src="/avatars/ai-lobster.svg"
                          alt="AI"
                          className="w-10 h-10 flex-shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform object-cover"
                          style={{ 
                            clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))'
                          }}
                        />
                      ) : item.user.avatar && (item.user.avatar.startsWith('/') || item.user.avatar.startsWith('data:')) ? (
                        <img 
                          src={item.user.avatar}
                          alt={item.user.name}
                          className="w-10 h-10 flex-shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform object-cover"
                          style={{ 
                            clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))'
                          }}
                        />
                      ) : (
                        <div 
                          className="w-10 h-10 flex items-center justify-center text-sm font-medium text-[#0a0a0f] flex-shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform font-orbitron"
                          style={{ 
                            background: `linear-gradient(135deg, ${stringToColor(item.user.name)} 0%, ${adjustColor(stringToColor(item.user.name), -30)} 100%)`,
                            clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))'
                          }}
                        >
                          {item.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {/* 评论内容区 */}
                      <div className="flex-1 min-w-0">
                        {/* 用户名和标签 */}
                        <div className="flex items-center gap-2 mb-1">
                          {isAIUser(item.user.name) ? (
                            <span className="inline-flex items-center gap-1 text-sm font-bold font-orbitron"
                              style={{ color: '#c084fc' }}>
                              <Zap className="w-3 h-3 text-purple-400" />
                              {item.user.name}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-[#e0e0e0] font-orbitron">{item.user.name}</span>
                          )}
                          {item.user.name === user.username && !isAIUser(item.user.name) && (
                            <span 
                              className="px-1.5 py-0.5 bg-[#00ff88] text-[#0a0a0f] text-[10px] font-medium"
                              style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                            >
                              作者
                            </span>
                          )}
                          {item.user.role === 'ADMIN' && !isAIUser(item.user.name) && (
                            <span 
                              className="px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ 
                                background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                                color: '#000',
                                clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                              }}
                            >
                              👑 站长
                            </span>
                          )}
                        </div>
                        
                        {/* 评论内容 */}
                        <div className="text-sm text-[#e0e0e0] leading-relaxed font-mono">
                          {item.replyTo ? (
                            <span>
                              回复 <span className="text-[#00ff88] font-semibold">@{item.replyTo.name}</span>：{item.content}
                            </span>
                          ) : (
                            item.content
                          )}
                        </div>
                        
                        {/* 图片 */}
                        {item.images && item.images.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {item.images.map((img, idx) => (
                              <img 
                                key={idx} 
                                src={img} 
                                alt="" 
                                className="w-20 h-20 object-cover border border-[#2a2a3a] hover:opacity-90 cursor-pointer transition-opacity"
                                style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* 操作栏 */}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-[#6b7280] font-mono">{item.time}</span>
                          <button 
                            onClick={() => handleReply(item)}
                            className="text-xs font-semibold text-[#6b7280] hover:text-[#00ff88] transition-colors font-mono"
                          >
                            回复
                          </button>
                          <button 
                            onClick={() => toggleCommentLike(item.id)}
                            className={`text-xs font-semibold flex items-center gap-1 transition-colors font-mono ${item.isLiked ? 'text-[#ff3366]' : 'text-[#6b7280] hover:text-[#ff3366]'}`}
                          >
                            <Heart className={`w-3 h-3 ${item.isLiked ? 'fill-current' : ''}`} />
                            {item.likes > 0 && item.likes}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* 回复列表 */}
                    {item.replies && item.replies.length > 0 && (
                      <div className="ml-11 mt-2">
                        {!expandedReplies.has(item.id) ? (
                          /* 折叠状态 */
                          <button 
                            onClick={() => toggleReplies(item.id)}
                            className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#00ff88] font-medium py-1 group font-mono"
                          >
                            <span className="w-8 h-[1px] bg-[#2a2a3a] group-hover:bg-[#00ff88] transition-colors"></span>
                            <span>展开 {item.replies.length} 条回复</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          /* 展开状态 */
                          <div className="space-y-2 animate-in fade-in duration-200">
                            {item.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2 group">
                                {/* 小头像 */}
                                {reply.user.avatar === '/avatars/ai-lobster.svg' ? (
                                  <img 
                                    src="/avatars/ai-lobster.svg"
                                    alt="AI"
                                    className="w-6 h-6 flex-shrink-0 mt-0.5 cursor-pointer hover:scale-105 transition-transform object-cover"
                                    style={{ 
                                      clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                                    }}
                                  />
                                ) : (
                                  <div 
                                    className="w-6 h-6 flex items-center justify-center text-[10px] font-medium text-[#0a0a0f] flex-shrink-0 mt-0.5 font-orbitron"
                                    style={{ 
                                      background: `linear-gradient(135deg, ${stringToColor(reply.user.name)} 0%, ${adjustColor(stringToColor(reply.user.name), -30)} 100%)`,
                                      clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                                    }}
                                  >
                                    {reply.user.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                
                                {/* 回复内容 */}
                                <div 
                                  className="flex-1 min-w-0 bg-[#1c1c2e] px-3 py-2 group-hover:bg-[#242838] transition-colors"
                                  style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isAIUser(reply.user.name) ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold font-orbitron"
                                        style={{ color: '#c084fc' }}>
                                        <Zap className="w-3 h-3 text-purple-400" />
                                        {reply.user.name}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-semibold text-[#e0e0e0] font-orbitron">{reply.user.name}</span>
                                    )}
                                    {reply.user.name === 'admin' && !isAIUser(reply.user.name) && (
                                      <span 
                                        className="px-1 py-0 bg-[#ff3366] text-[#0a0a0f] text-[9px] font-medium"
                                        style={{ clipPath: 'polygon(0 0, calc(100% - 1px) 0, 100% 1px, 100% 100%, 1px 100%, 0 calc(100% - 1px))' }}
                                      >
                                        管理员
                                      </span>
                                    )}
                                    <span 
                                      className="text-[10px] text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 border border-[#00ff88]/30"
                                      style={{ clipPath: 'polygon(0 0, calc(100% - 1px) 0, 100% 1px, 100% 100%, 1px 100%, 0 calc(100% - 1px))' }}
                                    >
                                      回复 @{item.user.name}
                                    </span>
                                    <span className="text-xs text-[#6b7280] font-mono">{reply.time}</span>
                                  </div>
                                  <p className="text-sm text-[#e0e0e0] mt-0.5 font-mono">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                            
                            {/* 收起按钮 */}
                            <button 
                              onClick={() => toggleReplies(item.id)}
                              className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#00ff88] font-medium py-1 group font-mono"
                            >
                              <span className="w-8 h-[1px] bg-[#2a2a3a] group-hover:bg-[#00ff88] transition-colors"></span>
                              <span>收起回复</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 加载更多 */}
                {visibleCount < comments.length && (
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="w-full py-3 text-sm text-[#6b7280] hover:text-[#e0e0e0] hover:bg-[#1c1c2e] transition-all flex items-center justify-center gap-2 border border-dashed border-[#2a2a3a] hover:border-[#00ff88]/50 font-mono"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        展开更多评论 ({comments.length - visibleCount})
                      </>
                    )}
                  </button>
                )}
                
                {visibleCount >= comments.length && comments.length > 5 && (
                  <div className="text-center py-4">
                    <div 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1c1c2e] text-[#6b7280]"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">已显示全部 {comments.length} 条评论</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
            
            {/* 底部输入框 */}
            <div className="border-t border-[#2a2a3a] bg-[#12121a] p-5 flex-shrink-0">
              {/* 回复提示 */}
              {replyTo && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <div 
                    className="flex items-center gap-2 text-xs px-3 py-1.5 text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    回复 <span className="font-semibold">@{replyTo.name}</span>
                  </div>
                  <button 
                    onClick={cancelReply} 
                    className="p-1.5 hover:bg-[#1c1c2e] transition-colors"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                  >
                    <X className="w-4 h-4 text-[#6b7280]" />
                  </button>
                </div>
              )}
              
              {/* 输入框区域 */}
              <div className="flex items-end gap-3">
                <div 
                  className="flex-1 bg-[#0a0a0f] px-4 py-3 flex items-end gap-3 border border-[#2a2a3a] focus-within:border-[#00ff88] focus-within:shadow-[0_0_10px_#00ff8840] transition-all"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  <textarea
                    ref={commentInputRef}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={replyTo ? `回复 ${replyTo.name}...` : `分享你的想法...`}
                    className="flex-1 bg-transparent text-sm text-[#e0e0e0] placeholder:text-[#6b7280] focus:outline-none min-h-[20px] max-h-[80px] resize-none font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submitComment()
                      }
                    }}
                    rows={1}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowEmoji(!showEmoji)}
                      className={`p-2 transition-all ${showEmoji ? 'text-[#00ff88] bg-[#00ff88]/10' : 'text-[#6b7280] hover:text-[#e0e0e0] hover:bg-[#1c1c2e]'}`}
                      style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-[#6b7280] hover:text-[#e0e0e0] hover:bg-[#1c1c2e] transition-all"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                <button
                  onClick={submitComment}
                  disabled={!comment.trim() && uploadedImages.length === 0}
                  className="px-5 py-3 bg-[#00ff88] text-[#0a0a0f] font-semibold text-sm hover:bg-[#00ff88]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-orbitron"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  <Send className="w-4 h-4" />
                  发送
                </button>
              </div>
              
              {/* 表情选择器 */}
              {showEmoji && (
                <div className="mt-3 p-3 bg-[#1c1c2e] border border-[#2a2a3a] animate-in fade-in slide-in-from-bottom-2 duration-200"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                >
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-9 h-9 flex items-center justify-center text-lg hover:bg-[#2a2a3a] transition-colors"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 已上传图片预览 */}
              {uploadedImages.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img 
                        src={img} 
                        alt="" 
                        className="w-16 h-16 object-cover border border-[#2a2a3a]"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-[#ff3366] text-[#0a0a0f] flex items-center justify-center text-xs"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 1px) 0, 100% 1px, 100% 100%, 1px 100%, 0 calc(100% - 1px))' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 举报弹窗 */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="share"
        targetId={share.id}
        targetTitle={share.content.slice(0, 50) + (share.content.length > 50 ? '...' : '')}
      />

      {/* 图片预览弹窗 - 使用 Portal 避免被遮挡 */}
      {previewImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200"
          style={{ zIndex: 99999 }}
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-[#e0e0e0]/80 hover:text-[#e0e0e0] bg-[#1c1c2e]/50 hover:bg-[#1c1c2e] transition-colors"
            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={previewImage} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
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
    '#00ff88', '#00d4ff', '#ff00ff', '#ff3366', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
  ]
  return colors[Math.abs(hash) % colors.length]
}

// 调整颜色亮度
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
