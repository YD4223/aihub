'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  User, Heart, Share2, Settings, LogOut, 
  Edit3, MapPin, Link as LinkIcon, Calendar,
  MessageCircle, ThumbsUp, Bookmark, ExternalLink,
  Trash2, Search, Grid, List, ChevronLeft, ChevronRight,
  X, Lock, Bell, Eye, EyeOff, Loader2, Check,
  Mail, Globe, MessageSquare, Shield, UserCircle,
  Volume2, VolumeX, Users, AlertCircle, AlertTriangle, BarChart3,
  UserPlus, Info, Clock, CheckCheck
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Avatar from '@/components/Avatar'
import { getAvatarInitial } from '@/lib/utils'

interface UserData {
  id: number
  username: string
  email: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  website: string | null
  createdAt: string
  githubId: string | null
}

interface LikedTool {
  id: number
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  websiteUrl: string
  category: string
  likedAt: string
}

interface FavoriteTool {
  id: number
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  websiteUrl: string
  category: string
  addedAt: string
}

interface FavoriteShare {
  id: number
  content: string
  images: string | null
  createdAt: string
  addedAt: string
  tool: {
    id: number
    name: string
    slug: string
    shortDesc: string | null
    description: string | null
    websiteUrl: string | null
    category: { name: string; slug: string } | null
  }
  user: {
    id: number
    username: string
    avatarUrl: string | null
  }
}

interface UserShare {
  id: number
  content: string
  images: string[] | null
  likes: number
  status: string
  createdAt: string
  tool: {
    id: number
    name: string
    slug: string
    shortDesc: string | null
    description: string | null
    websiteUrl: string | null
    category: { name: string; slug: string } | null
  }
  _count: {
    comments: number
  }
}

interface SubmittedTool {
  id: number
  name: string
  slug: string
  shortDesc: string | null
  description: string | null
  websiteUrl: string
  logoUrl: string | null
  status: string
  createdAt: string
  category: { name: string; slug: string } | null
  _count: {
    comments: number
    shares: number
  }
}

const ITEMS_PER_PAGE = 8

// 根据字符串生成一致的颜色
function stringToColor(str: string | undefined | null): string {
  if (!str) return '#3B82F6' // 默认颜色
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

export default function UserCenterPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState('shares')
  const [loading, setLoading] = useState(true)
  const [likedTools, setLikedTools] = useState<LikedTool[]>([])
  const [favorites, setFavorites] = useState<FavoriteTool[]>([])
  const [favoriteShares, setFavoriteShares] = useState<FavoriteShare[]>([])
  const [userShares, setUserShares] = useState<UserShare[]>([])
  const [userSharesLoading, setUserSharesLoading] = useState(false)
  const [userSharesTotal, setUserSharesTotal] = useState(0)
  const [submittedTools, setSubmittedTools] = useState<SubmittedTool[]>([])
  const [submittedToolsLoading, setSubmittedToolsLoading] = useState(false)
  const [submittedToolsTotal, setSubmittedToolsTotal] = useState(0)
  
  // 搜索和分页状态
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // 注销账户状态
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)

  // 通知未读数
  const [unreadCount, setUnreadCount] = useState(0)

  // 通知列表状态
  const PAGE_SIZE_NOTIF = 20
  const [notifList, setNotifList] = useState<any[]>([])
  const [notifTotal, setNotifTotal] = useState(0)
  const [notifPage, setNotifPage] = useState(1)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifMarking, setNotifMarking] = useState<number | null>(null)

  // 获取通知列表
  const fetchNotifList = useCallback(async (p: number) => {
    if (!user?.id) return
    setNotifLoading(true)
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}&page=${p}&pageSize=${PAGE_SIZE_NOTIF}`)
      const data = await res.json()
      if (data.notifications) {
        setNotifList(data.notifications)
        setNotifTotal(data.total || 0)
      }
    } catch (e) {
      console.error('获取通知列表失败:', e)
    } finally {
      setNotifLoading(false)
    }
  }, [user?.id])

  // 标记单条已读
  const handleMarkNotifRead = async (id: number) => {
    if (!user?.id) return
    setNotifMarking(id)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, userId: user.id }),
      })
      setNotifList(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error('标记已读失败:', e)
    } finally {
      setNotifMarking(null)
    }
  }

  // 全部标记已读
  const handleMarkAllNotifRead = async () => {
    if (!user?.id) return
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      setNotifList(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error('全部标记已读失败:', e)
    }
  }

  // tab 切换时获取通知
  useEffect(() => {
    if (activeTab === 'notifications' && user?.id) {
      fetchNotifList(notifPage)
    }
  }, [activeTab, user?.id])

  // 通知分页切换
  useEffect(() => {
    if (activeTab === 'notifications' && user?.id) {
      fetchNotifList(notifPage)
    }
  }, [notifPage, activeTab, user?.id])

  // 从服务器获取最新用户资料（确保头像等信息是最新的）
  const fetchLatestUserProfile = async (userId: number, fallbackUser: UserData) => {
    try {
      const res = await fetch(`/api/user/profile/${userId}?viewerId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        const latestUser = data.user || data
        // 合并最新数据到 localStorage（保留 token 等字段）
        const mergedUser = { ...fallbackUser, ...latestUser }
        setUser(mergedUser)
        localStorage.setItem('user', JSON.stringify(mergedUser))
      }
    } catch (e) {
      // 静默失败，使用 localStorage 的数据
    }
  }

  // 从服务器加载数据的函数
  const loadDataFromStorage = () => {
    try {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        // 用户数据加载后立即获取数据
        if (parsedUser?.id) {
          // 从服务器获取最新用户数据（确保头像等信息是最新的）
          fetchLatestUserProfile(parsedUser.id, parsedUser)
          if (activeTab === 'shares') {
            loadSubmittedTools(1, parsedUser.id)
          }
          // 从数据库加载收藏/点赞数据
          loadFromServer(parsedUser.id)
        }
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
    }
  }

  // 从服务器加载收藏/点赞数据
  const loadFromServer = async (userId: number) => {
    try {
      const [likesRes, favRes, shareFavRes] = await Promise.all([
        fetch(`/api/user/likes?userId=${userId}`),
        fetch(`/api/user/favorites?userId=${userId}`),
        fetch(`/api/user/favorite-shares?userId=${userId}`)
      ])
      if (likesRes.ok) {
        const data = await likesRes.json()
        setLikedTools(data.likes || [])
      }
      if (favRes.ok) {
        const data = await favRes.json()
        setFavorites(data.favorites || [])
      }
      if (shareFavRes.ok) {
        const data = await shareFavRes.json()
        setFavoriteShares(data.shares || [])
      }

      // 加载未读通知数
      const unreadRes = await fetch(`/api/notifications/unread?userId=${userId}`)
      if (unreadRes.ok) {
        const data = await unreadRes.json()
        setUnreadCount(data.count || 0)
      }
    } catch (e) {
      console.error('加载收藏数据失败:', e)
    }
  }

  useEffect(() => {
    loadDataFromStorage()
    setLoading(false)

    // 监听 storage 变化（当其他页面修改 localStorage 时）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'likedTools' || e.key === 'favorites' || e.key === 'favoriteShares') {
        loadDataFromStorage()
      }
    }

    // 监听自定义事件（当同一页面内修改 localStorage 时）
    const handleCustomStorageChange = () => {
      loadDataFromStorage()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorageChange', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
    }
  }, [])

  // 切换标签页时重置搜索和分页
  useEffect(() => {
    setSearchQuery('')
    setCurrentPage(1)
    // 切换到"我的分享"标签页时加载数据
    if (activeTab === 'shares' && user?.id) {
      loadSubmittedTools(1, user.id)
    }
  }, [activeTab, user?.id])

  // 删除点赞
  const removeLike = (toolId: number) => {
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    const user = JSON.parse(userStr)
    fetch(`/api/user/likes?userId=${user.id}&toolId=${toolId}`, { method: 'DELETE' })
      .catch(() => {})
    const newLikes = likedTools.filter(t => t.id !== toolId)
    setLikedTools(newLikes)
  }

  // 删除收藏
  const removeFavorite = (toolId: number) => {
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    const user = JSON.parse(userStr)
    fetch(`/api/user/favorites?userId=${user.id}&toolId=${toolId}`, { method: 'DELETE' })
      .catch(() => {})
    const newFavorites = favorites.filter(t => t.id !== toolId)
    setFavorites(newFavorites)
  }

  // 删除收藏的分享
  const removeFavoriteShare = (shareId: number) => {
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    const user = JSON.parse(userStr)
    fetch(`/api/user/favorite-shares?userId=${user.id}&shareId=${shareId}`, { method: 'DELETE' })
      .catch(() => {})
    const newFavoriteShares = favoriteShares.filter(s => s.id !== shareId)
    setFavoriteShares(newFavoriteShares)
  }

  // 获取用户的分享列表
  const loadUserShares = async (page = 1, targetUserId?: number) => {
    const uid = targetUserId || user?.id
    if (!uid) return
    setUserSharesLoading(true)
    try {
      const res = await fetch(`/api/user/shares?userId=${uid}&page=${page}&limit=10`, {
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        setUserShares(data.shares)
        setUserSharesTotal(data.total)
      }
    } catch (error) {
      console.error('获取用户分享失败:', error)
    } finally {
      setUserSharesLoading(false)
    }
  }

  // 获取用户提交的工具列表
  const loadSubmittedTools = async (page = 1, targetUserId?: number) => {
    const uid = targetUserId || user?.id
    if (!uid) return
    setSubmittedToolsLoading(true)
    try {
      const res = await fetch(`/api/user/tools?userId=${uid}&page=${page}&limit=12`, {
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        setSubmittedTools(data.tools)
        setSubmittedToolsTotal(data.total)
      }
    } catch (error) {
      console.error('获取用户工具失败:', error)
    } finally {
      setSubmittedToolsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('sessionToken')
    router.push('/')
    router.refresh()
  }

  // 筛选和分页逻辑
  const getFilteredAndPagedItems = <T extends { name?: string; content?: string }>(
    items: T[],
    searchKey: keyof T
  ) => {
    const filtered = searchQuery
      ? items.filter(item => {
          const value = item[searchKey]
          return typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
        })
      : items
    
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const pagedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    
    return { filtered, pagedItems, totalPages, totalCount: filtered.length }
  }

  // 分页组件
  const Pagination = ({ totalPages, totalCount }: { totalPages: number; totalCount: number }) => {
    if (totalPages <= 1) return null
    
    return (
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-cyber-border">
        <span className="text-sm text-cyber-muted-foreground font-mono">
          {'>'} 共 {totalCount} 条，第 {currentPage}/{totalPages} 页
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-cyber-border disabled:opacity-50 disabled:cursor-not-allowed hover:border-neon-cyan hover:text-neon-cyan transition-colors"
            style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
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
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 text-sm font-mono transition-colors ${
                  currentPage === pageNum
                    ? 'bg-neon-cyan text-cyber-background'
                    : 'border border-cyber-border hover:border-neon-cyan hover:text-neon-cyan'
                }`}
                style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-cyber-border disabled:opacity-50 disabled:cursor-not-allowed hover:border-neon-cyan hover:text-neon-cyan transition-colors"
            style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // 搜索栏组件
  const SearchBar = ({ placeholder }: { placeholder: string }) => (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted-foreground" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setCurrentPage(1)
        }}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-cyan focus:outline-none transition-colors"
        style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted-foreground hover:text-neon-cyan transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  // 视图切换按钮
  const ViewToggle = () => (
    <div className="flex items-center gap-1 bg-cyber-card border border-cyber-border p-1">
      <button
        onClick={() => setViewMode('grid')}
        className={`p-1.5 transition-colors ${
          viewMode === 'grid' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-cyber-muted-foreground hover:text-cyber-foreground'
        }`}
        style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-1.5 transition-colors ${
          viewMode === 'list' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-cyber-muted-foreground hover:text-cyber-foreground'
        }`}
        style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  )

  // 工具卡片组件
  const ToolCard = ({ 
    tool, 
    onRemove, 
    removeLabel = '删除',
    dateField 
  }: { 
    tool: LikedTool | FavoriteTool
    onRemove: () => void
    removeLabel?: string
    dateField?: string
  }) => {
    const isGrid = viewMode === 'grid'
    const toolName = tool.name || '未知工具'
    const toolColor = stringToColor(toolName)
    
    if (isGrid) {
      return (
        <div className="group bg-cyber-card border border-cyber-border p-4 hover:border-neon-cyan/50 transition-all duration-300"
          style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-cyber-background font-bold font-orbitron"
              style={{ background: toolColor, clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              {toolName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-orbitron font-semibold text-cyber-foreground truncate text-sm">{toolName}</h3>
              <span className="text-xs px-1.5 py-0.5 bg-cyber-muted/50 text-cyber-muted-foreground font-mono"
                style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                {tool.category || '未分类'}
              </span>
            </div>
          </div>
          <p className="text-xs text-cyber-muted-foreground line-clamp-2 mt-2 mb-3 font-mono">
            {tool.description || '暂无描述'}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/tools/${tool.slug}`}
              target="_blank"
              className="flex-1 text-center text-xs bg-neon-cyan/10 text-neon-cyan py-1.5 hover:bg-neon-cyan/20 transition-colors font-mono"
              style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              查看详情
            </Link>
            <button
              onClick={onRemove}
              className="p-1.5 text-cyber-muted-foreground hover:text-neon-red transition-colors"
              title={removeLabel}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="group flex items-center gap-4 bg-cyber-card border border-cyber-border p-3 hover:border-neon-cyan/50 transition-all duration-300"
        style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
        <div 
          className="w-12 h-12 flex items-center justify-center flex-shrink-0 text-cyber-background font-bold font-orbitron"
          style={{ background: toolColor, clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
        >
          {toolName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-orbitron font-semibold text-cyber-foreground truncate">{toolName}</h3>
            <span className="text-xs px-2 py-0.5 bg-cyber-muted/50 text-cyber-muted-foreground font-mono"
              style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
              {tool.category || '未分类'}
            </span>
          </div>
          <p className="text-sm text-cyber-muted-foreground truncate font-mono">{tool.description || '暂无描述'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tools/${tool.slug}`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-neon-cyan hover:bg-neon-cyan/10 transition-colors font-mono"
            style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            详情
          </Link>
          <button
            onClick={onRemove}
            className="p-2 text-cyber-muted-foreground hover:text-neon-red transition-colors"
            title={removeLabel}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // 分享卡片组件
  const ShareCard = ({ share, onRemove }: { share: FavoriteShare; onRemove: () => void }) => (
    <div className="bg-cyber-card border border-cyber-border p-4 hover:border-neon-magenta/50 transition-all duration-300"
      style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 flex items-center justify-center text-cyber-background font-bold flex-shrink-0 font-orbitron"
          style={{ background: stringToColor(share.user.username), clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
        >
          {getAvatarInitial(share.user.username)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-orbitron font-medium text-cyber-foreground">{share.user.username}</span>
            <span className="text-xs text-cyber-muted-foreground font-mono">
              {new Date(share.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <p className="text-cyber-foreground/80 text-sm mt-1 line-clamp-3 font-mono">{share.content}</p>
        </div>
      </div>
      
      <div className="bg-cyber-muted/30 p-3 mt-3" style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
        <div className="flex items-center gap-2">
          <span className="font-orbitron font-medium text-cyber-foreground text-sm">{share.tool.name}</span>
          {share.tool.category && (
            <span className="text-xs px-2 py-0.5 bg-cyber-card text-cyber-muted-foreground font-mono"
              style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
              {share.tool.category.name}
            </span>
          )}
        </div>
        <p className="text-xs text-cyber-muted-foreground mt-1 line-clamp-1 font-mono">
          {share.tool.shortDesc || share.tool.description}
        </p>
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-cyber-border">
        <Link
          href={`/tools/${share.tool.slug}`}
          className="text-sm text-neon-cyan hover:text-neon-cyan/80 font-mono"
        >
          {'>'} 查看工具
        </Link>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-sm text-cyber-muted-foreground hover:text-neon-red transition-colors font-mono"
        >
          <Trash2 className="w-4 h-4" />
          取消收藏
        </button>
      </div>
    </div>
  )

  // 用户分享项组件
  const UserShareItem = ({ share }: { share: UserShare }) => {
    const shareImages = share.images || []
    const statusColors: Record<string, string> = {
      approved: 'bg-neon-green/20 text-neon-green border-neon-green/30',
      pending: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
      rejected: 'bg-neon-red/20 text-neon-red border-neon-red/30'
    }
    const statusLabels: Record<string, string> = {
      approved: '已通过',
      pending: '审核中',
      rejected: '已拒绝'
    }
    
    return (
      <div className="bg-cyber-card border border-cyber-border p-4 hover:border-neon-cyan/50 transition-all duration-300"
        style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs px-2 py-0.5 border font-mono ${statusColors[share.status] || 'bg-cyber-muted/50 text-cyber-muted-foreground border-cyber-border'}`}
                style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                {statusLabels[share.status] || share.status}
              </span>
              <span className="text-xs text-cyber-muted-foreground font-mono">
                {new Date(share.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <p className="text-cyber-foreground text-sm mb-3 font-mono">{share.content}</p>
            
            {/* 分享图片 */}
            {shareImages.length > 0 && (
              <div className={`grid gap-2 mb-3 ${shareImages.length === 1 ? 'grid-cols-1' : shareImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {shareImages.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt="" 
                    className="w-full h-32 object-cover"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  />
                ))}
              </div>
            )}
            
            {/* 关联工具 */}
            <div className="bg-cyber-muted/30 p-3" style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-medium text-cyber-foreground text-sm">{share.tool.name}</span>
                {share.tool.category && (
                  <span className="text-xs px-2 py-0.5 bg-cyber-card text-cyber-muted-foreground font-mono"
                    style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                    {share.tool.category.name}
                  </span>
                )}
              </div>
            </div>
            
            {/* 互动数据 */}
            <div className="flex items-center gap-4 mt-3 text-sm text-cyber-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-neon-magenta" />
                {share.likes} 赞
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4 text-neon-cyan" />
                {share._count.comments} 评论
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 提交的工具卡片组件
  const SubmittedToolCard = ({ tool }: { tool: SubmittedTool }) => {
    const statusColors: Record<string, string> = {
      approved: 'bg-neon-green/20 text-neon-green border-neon-green/30',
      pending: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
      rejected: 'bg-neon-red/20 text-neon-red border-neon-red/30'
    }
    const statusLabels: Record<string, string> = {
      approved: '已通过',
      pending: '审核中',
      rejected: '已拒绝'
    }
    const toolColor = stringToColor(tool.name)
    const isGrid = viewMode === 'grid'
    
    if (isGrid) {
      return (
        <div className="group bg-cyber-card border border-cyber-border p-4 hover:border-neon-cyan/50 transition-all duration-300"
          style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
          <div className="flex items-start gap-3">
            {tool.logoUrl ? (
              <img src={tool.logoUrl} alt={tool.name} className="w-10 h-10 object-cover flex-shrink-0"
                style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }} />
            ) : (
              <div 
                className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-cyber-background font-bold font-orbitron"
                style={{ background: toolColor, clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
              >
                {tool.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-orbitron font-semibold text-cyber-foreground truncate text-sm">{tool.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 border font-mono ${statusColors[tool.status] || 'bg-cyber-muted/50 text-cyber-muted-foreground border-cyber-border'}`}
                  style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                  {statusLabels[tool.status] || tool.status}
                </span>
                {tool.category && (
                  <span className="text-xs px-1.5 py-0.5 bg-cyber-muted/50 text-cyber-muted-foreground font-mono"
                    style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                    {tool.category.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-cyber-muted-foreground line-clamp-2 mt-2 mb-3 font-mono">
            {tool.shortDesc || tool.description || '暂无描述'}
          </p>
          <div className="flex items-center gap-3 text-xs text-cyber-muted-foreground mb-3 font-mono">
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3 text-neon-cyan" />
              {tool._count.comments}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="w-3 h-3 text-neon-magenta" />
              {tool._count.shares}
            </span>
            <span>{new Date(tool.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <Link
            href={`/tools/${tool.slug}`}
            className="block text-center text-xs bg-neon-cyan/10 text-neon-cyan py-1.5 hover:bg-neon-cyan/20 transition-colors font-mono"
            style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            查看详情
          </Link>
        </div>
      )
    }
    
    return (
      <div className="group flex items-center gap-4 bg-cyber-card border border-cyber-border p-3 hover:border-neon-cyan/50 transition-all duration-300"
        style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
        {tool.logoUrl ? (
          <img src={tool.logoUrl} alt={tool.name} className="w-12 h-12 object-cover flex-shrink-0"
            style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }} />
        ) : (
          <div 
            className="w-12 h-12 flex items-center justify-center flex-shrink-0 text-cyber-background font-bold font-orbitron"
            style={{ background: toolColor, clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            {tool.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-orbitron font-semibold text-cyber-foreground truncate">{tool.name}</h3>
            <span className={`text-xs px-2 py-0.5 border font-mono ${statusColors[tool.status] || 'bg-cyber-muted/50 text-cyber-muted-foreground border-cyber-border'}`}
              style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
              {statusLabels[tool.status] || tool.status}
            </span>
            {tool.category && (
              <span className="text-xs px-2 py-0.5 bg-cyber-muted/50 text-cyber-muted-foreground font-mono"
                style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                {tool.category.name}
              </span>
            )}
          </div>
          <p className="text-sm text-cyber-muted-foreground truncate font-mono">{tool.shortDesc || tool.description || '暂无描述'}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-cyber-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4 text-neon-cyan" />
            {tool._count.comments}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-4 h-4 text-neon-magenta" />
            {tool._count.shares}
          </span>
          <span className="text-xs">{new Date(tool.createdAt).toLocaleDateString('zh-CN')}</span>
          <Link
            href={`/tools/${tool.slug}`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
            style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            详情
          </Link>
        </div>
      </div>
    )
  }

  // 空状态组件
  const EmptyState = ({ 
    icon: Icon, 
    title, 
    description, 
    action 
  }: { 
    icon: React.ElementType
    title: string
    description: string
    action?: { label: string; href: string }
  }) => (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-cyber-muted/30 flex items-center justify-center mx-auto mb-4"
        style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
        <Icon className="w-10 h-10 text-cyber-muted-foreground" />
      </div>
      <h3 className="text-lg font-orbitron font-medium text-cyber-foreground mb-2">{title}</h3>
      <p className="text-cyber-muted-foreground mb-6 font-mono">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 bg-neon-cyan text-cyber-background px-6 py-2.5 font-orbitron font-medium hover:shadow-neon-cyan transition-all"
          style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
        >
          {action.label}
        </Link>
      )}
    </div>
  )

  // 密码输入框组件（带显示/隐藏切换）
  const PasswordInput = ({
    label,
    value,
    onChange,
    required = true,
    minLength,
    placeholder
  }: {
    label: string
    value: string
    onChange: (value: string) => void
    required?: boolean
    minLength?: number
    placeholder?: string
  }) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div>
        <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">{label}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-12 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-cyan focus:outline-none transition-colors"
            style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
            required={required}
            minLength={minLength}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted-foreground hover:text-neon-cyan transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
    )
  }

  // 赛博朋克风格密码输入框（霓虹绿主题）
  const PasswordInputCyber = ({
    label,
    value,
    onChange,
    required = true,
    minLength,
    placeholder
  }: {
    label: string
    value: string
    onChange: (value: string) => void
    required?: boolean
    minLength?: number
    placeholder?: string
  }) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="cyber-pwd">
        <label className="block text-sm font-mono text-[#888] mb-2 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#00ff88]/60" />
          {label}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-12 bg-[#0a0f14] border border-[#2a2a3a] text-white font-mono placeholder:text-[#555] focus:border-[#00ff88] focus:shadow-[0_0_16px_rgba(0,255,136,0.15)] focus:outline-none transition-all rounded-lg"
            required={required}
            minLength={minLength}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#00ff88] transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
    )
  }

  // 设置面板组件
  const SettingsPanel = ({ user }: { user: UserData }) => {
    const [activeSetting, setActiveSetting] = useState<string | null>(null)
    const [passwordData, setPasswordData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    
    // 通知设置
    const [notificationSettings, setNotificationSettings] = useState({
      email: true,
      site: true,
      comment: true,
      like: false,
      follow: false,
    })
    
    // 隐私设置
    const [privacySettings, setPrivacySettings] = useState({
      profilePublic: true,
      showEmail: false,
      showLocation: true,
      showWebsite: true,
      allowComment: true,
      showStats: false,
    })
    
    const [settingsLoading, setSettingsLoading] = useState(false)

    // 加载用户设置
    useEffect(() => {
      if (activeSetting === 'notifications' || activeSetting === 'privacy') {
        loadSettings()
      }
    }, [activeSetting])

    const loadSettings = async () => {
      setSettingsLoading(true)
      try {
        const res = await fetch(`/api/user/settings?userId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.notifications) {
            setNotificationSettings(data.notifications)
          }
          if (data.privacy) {
            setPrivacySettings(data.privacy)
          }
        }
      } catch (err) {
        console.error('加载设置失败:', err)
      } finally {
        setSettingsLoading(false)
      }
    }

    const saveNotificationSettings = async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/user/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            type: 'notifications',
            settings: notificationSettings
          })
        })
        if (res.ok) {
          setMessage({ type: 'success', text: '通知设置已保存' })
          setTimeout(() => setMessage({ type: '', text: '' }), 2000)
        }
      } catch (err) {
        setMessage({ type: 'error', text: '保存失败' })
      } finally {
        setSaving(false)
      }
    }

    const savePrivacySettings = async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/user/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            type: 'privacy',
            settings: privacySettings
          })
        })
        if (res.ok) {
          setMessage({ type: 'success', text: '隐私设置已保存' })
          setTimeout(() => setMessage({ type: '', text: '' }), 2000)
        }
      } catch (err) {
        setMessage({ type: 'error', text: '保存失败' })
      } finally {
        setSaving(false)
      }
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault()
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setMessage({ type: 'error', text: '两次输入的新密码不一致' })
        return
      }
      if (passwordData.newPassword.length < 6) {
        setMessage({ type: 'error', text: '新密码至少需要6位' })
        return
      }

      setSaving(true)
      setMessage({ type: '', text: '' })

      try {
        const res = await fetch('/api/user/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
          })
        })

        if (res.ok) {
          setMessage({ type: 'success', text: '密码修改成功！' })
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
          setTimeout(() => setActiveSetting(null), 1500)
        } else {
          const error = await res.json()
          setMessage({ type: 'error', text: error.error || '修改失败' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: '网络错误，请重试' })
      } finally {
        setSaving(false)
      }
    }

    // 开关组件 - 赛博朋克精致版
    const ToggleSwitch = ({ 
      checked, 
      onChange, 
      label, 
      description,
      icon: Icon,
      disabled = false
    }: { 
      checked: boolean
      onChange: (v: boolean) => void
      label: string
      description?: string
      icon?: React.ComponentType<{ className?: string }>
      disabled?: boolean
    }) => (
      <div className={`flex items-center justify-between py-3.5 px-4 rounded-lg transition-all duration-200 ${
        disabled ? 'bg-cyber-muted/20 opacity-50' : 'bg-cyber-card hover:bg-cyber-card/80'
      }`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {Icon && (
            <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              checked 
                ? 'bg-neon-green/15 text-neon-green shadow-[0_0_8px_rgba(0,255,136,0.15)]' 
                : 'bg-cyber-muted/30 text-cyber-muted-foreground'
            }`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
          )}
          <div className="min-w-0">
            <div className={`text-sm font-medium transition-colors duration-200 ${
              checked ? 'text-cyber-foreground' : 'text-cyber-muted-foreground'
            }`}>{label}</div>
            {description && <div className="text-xs text-cyber-muted-foreground/70 mt-0.5 font-mono truncate">{description}</div>}
          </div>
        </div>
        <button
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative flex-shrink-0 ml-3 w-11 h-6 rounded-full transition-all duration-300 ${
            checked 
              ? 'bg-neon-green shadow-[0_0_12px_rgba(0,255,136,0.3)]' 
              : 'bg-[#2a2a3a]'
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
              checked 
                ? 'translate-x-5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' 
                : 'translate-x-0 bg-[#555]'
            }`}
          />
        </button>
      </div>
    )

    // 设置项卡片
    const SettingCard = ({ 
      title, 
      description, 
      icon: Icon, 
      color,
      onClick 
    }: { 
      title: string
      description: string
      icon: React.ComponentType<{ className?: string }>
      color: string
      onClick: () => void
    }) => (
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 bg-cyber-card border border-cyber-border hover:border-neon-cyan/50 transition-all text-left"
        style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 flex items-center justify-center ${color}`}
            style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="font-orbitron font-semibold text-cyber-foreground">{title}</div>
            <div className="text-sm text-cyber-muted-foreground font-mono">{description}</div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-cyber-muted-foreground" />
      </button>
    )

    if (activeSetting === 'password') {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <button 
              onClick={() => setActiveSetting(null)}
              className="text-cyber-muted-foreground hover:text-neon-green font-mono transition-colors"
            >
              {'<'} 返回
            </button>
            <h3 className="font-orbitron font-semibold text-cyber-foreground">修改密码</h3>
          </div>

          {message.text && (
            <div className={`p-4 ${
              message.type === 'success' 
                ? 'bg-[rgba(0,255,136,0.08)] text-neon-green border border-[rgba(0,255,136,0.25)]' 
                : 'bg-neon-red/10 text-neon-red border border-neon-red/30'
            }`}
            style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-5">
            <PasswordInputCyber
              label="当前密码"
              value={passwordData.currentPassword}
              onChange={(value) => setPasswordData({ ...passwordData, currentPassword: value })}
              placeholder="请输入当前密码（GitHub 用户可留空）"
            />
            <PasswordInputCyber
              label="新密码"
              value={passwordData.newPassword}
              onChange={(value) => setPasswordData({ ...passwordData, newPassword: value })}
              minLength={6}
              placeholder="请输入新密码（至少6位）"
            />
            <PasswordInputCyber
              label="确认新密码"
              value={passwordData.confirmPassword}
              onChange={(value) => setPasswordData({ ...passwordData, confirmPassword: value })}
              placeholder="请再次输入新密码"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#0a0a0f] font-orbitron font-bold hover:shadow-[0_0_24px_rgba(0,255,136,0.35)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wider"
              style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 处理中...</> : '确认修改 →'}
            </button>
          </form>

          {/* 修复 autofill 黄色背景 */}
          <style dangerouslySetInnerHTML={{ __html: `
            .cyber-pwd input:-webkit-autofill,
            .cyber-pwd input:-webkit-autofill:hover,
            .cyber-pwd input:-webkit-autofill:focus {
              -webkit-box-shadow: 0 0 0 1000px #12121a inset !important;
              -webkit-text-fill-color: #fff !important;
              transition: background-color 5000s ease-in-out 0s;
            }
          ` }} />
        </div>
      )
    }

    if (activeSetting === 'notifications') {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <button 
              onClick={() => setActiveSetting(null)}
              className="text-cyber-muted-foreground hover:text-cyber-foreground font-mono"
            >
              {'<'} 返回
            </button>
            <h3 className="font-orbitron font-semibold text-cyber-foreground">通知设置</h3>
          </div>

          {message.text && (
            <div className={`p-4 ${
              message.type === 'success' 
                ? 'bg-neon-green/10 text-neon-green border border-neon-green/30' 
                : 'bg-neon-red/10 text-neon-red border border-neon-red/30'
            }`}
            style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
              {message.text}
            </div>
          )}

          {settingsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 总开关 */}
              <div className="bg-gradient-to-r from-neon-cyan/10 to-neon-magenta/10 border border-cyber-border p-4 mb-6"
                style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-cyber-card flex items-center justify-center"
                      style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                      <Bell className="w-6 h-6 text-neon-cyan" />
                    </div>
                    <div>
                      <div className="font-orbitron font-semibold text-cyber-foreground">接收所有通知</div>
                      <div className="text-sm text-cyber-muted-foreground font-mono">一键开启或关闭所有通知</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const allOn = Object.values(notificationSettings).every(v => v)
                      const newValue = !allOn
                      setNotificationSettings({
                        email: newValue,
                        site: newValue,
                        comment: newValue,
                        like: newValue,
                        follow: newValue,
                      })
                    }}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 ${
                      Object.values(notificationSettings).every(v => v) 
                        ? 'bg-neon-green shadow-[0_0_12px_rgba(0,255,136,0.3)]' 
                        : 'bg-[#2a2a3a]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
                        Object.values(notificationSettings).every(v => v) 
                          ? 'translate-x-5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' 
                          : 'translate-x-0 bg-[#555]'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 通知分类 */}
              <div className="space-y-2 bg-cyber-muted/20 p-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                <div className="px-4 py-2 text-sm font-medium text-cyber-muted-foreground font-mono">{'>'} 邮件通知</div>
                <ToggleSwitch
                  label="邮件通知"
                  description="重要更新、账号安全等信息将发送到你的邮箱"
                  icon={Mail}
                  checked={notificationSettings.email}
                  onChange={(v) => setNotificationSettings({ ...notificationSettings, email: v })}
                />
              </div>

              <div className="space-y-2 bg-cyber-muted/20 p-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                <div className="px-4 py-2 text-sm font-medium text-cyber-muted-foreground font-mono">{'>'} 站内通知</div>
                <ToggleSwitch
                  label="站内消息提醒"
                  description="在网站上显示通知徽章和弹窗提醒"
                  icon={Globe}
                  checked={notificationSettings.site}
                  onChange={(v) => setNotificationSettings({ ...notificationSettings, site: v })}
                />
              </div>

              <div className="space-y-2 bg-cyber-muted/20 p-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                <div className="px-4 py-2 text-sm font-medium text-cyber-muted-foreground font-mono">{'>'} 互动通知</div>
                <ToggleSwitch
                  label="评论通知"
                  description="有人评论你的分享时通知你"
                  icon={MessageSquare}
                  checked={notificationSettings.comment}
                  onChange={(v) => setNotificationSettings({ ...notificationSettings, comment: v })}
                />
                <ToggleSwitch
                  label="点赞通知"
                  description="有人点赞你的内容时通知你"
                  icon={ThumbsUp}
                  checked={notificationSettings.like}
                  onChange={(v) => setNotificationSettings({ ...notificationSettings, like: v })}
                />
                <ToggleSwitch
                  label="关注通知"
                  description="有人关注你时通知你"
                  icon={User}
                  checked={notificationSettings.follow}
                  onChange={(v) => setNotificationSettings({ ...notificationSettings, follow: v })}
                />
              </div>

              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#0a0a0f] font-orbitron font-bold hover:shadow-[0_0_24px_rgba(0,255,136,0.35)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wider"
                style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</> : '保存设置 →'}
              </button>
            </div>
          )}
        </div>
      )
    }

    if (activeSetting === 'privacy') {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <button 
              onClick={() => setActiveSetting(null)}
              className="text-cyber-muted-foreground hover:text-cyber-foreground font-mono"
            >
              {'<'} 返回
            </button>
            <h3 className="font-orbitron font-semibold text-cyber-foreground">隐私设置</h3>
          </div>

          {message.text && (
            <div className={`p-4 ${
              message.type === 'success' 
                ? 'bg-neon-green/10 text-neon-green border border-neon-green/30' 
                : 'bg-neon-red/10 text-neon-red border border-neon-red/30'
            }`}
            style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
              {message.text}
            </div>
          )}

          {settingsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 隐私总览卡片 */}
              <div className="bg-gradient-to-r from-neon-magenta/10 to-neon-cyan/10 border border-cyber-border p-4 mb-6"
                style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-cyber-card flex items-center justify-center"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                    <Shield className="w-7 h-7 text-neon-magenta" />
                  </div>
                  <div className="flex-1">
                    <div className="font-orbitron font-semibold text-cyber-foreground">隐私保护模式</div>
                    <div className="text-sm text-cyber-muted-foreground font-mono">
                      {privacySettings.profilePublic 
                        ? '> 你的资料对所有人可见' 
                        : '> 你的资料仅自己可见'}
                    </div>
                  </div>
                  <button
                    onClick={() => setPrivacySettings({ ...privacySettings, profilePublic: !privacySettings.profilePublic })}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 ${
                      privacySettings.profilePublic 
                        ? 'bg-neon-green shadow-[0_0_12px_rgba(0,255,136,0.3)]' 
                        : 'bg-[#2a2a3a]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
                        privacySettings.profilePublic 
                          ? 'translate-x-5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' 
                          : 'translate-x-0 bg-[#555]'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 个人资料可见性 */}
              <div className="space-y-2 bg-cyber-muted/20 p-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                <div className="px-4 py-2 text-sm font-medium text-cyber-muted-foreground font-mono">{'>'} 个人资料可见性</div>
                <ToggleSwitch
                  label="公开个人资料"
                  description="允许其他用户查看你的个人主页"
                  icon={Users}
                  checked={privacySettings.profilePublic}
                  onChange={(v) => setPrivacySettings({ ...privacySettings, profilePublic: v })}
                />
                
                {!privacySettings.profilePublic && (
                  <div className="mx-4 mb-3 p-3 bg-neon-yellow/10 border border-neon-yellow/30 flex items-start gap-2"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                    <AlertCircle className="w-4 h-4 text-neon-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-neon-yellow font-mono">
                      你的个人资料已设为私密，其他用户将无法查看你的主页
                    </p>
                  </div>
                )}
              </div>

              {/* 信息显示设置 */}
              <div className="space-y-2 bg-cyber-muted/20 p-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                <div className="px-4 py-2 text-sm font-medium text-cyber-muted-foreground font-mono">{'>'} 信息显示设置</div>
                <ToggleSwitch
                  label="显示邮箱"
                  description="在个人主页显示你的邮箱地址"
                  icon={Mail}
                  checked={privacySettings.showEmail}
                  onChange={(v) => setPrivacySettings({ ...privacySettings, showEmail: v })}
                  disabled={!privacySettings.profilePublic}
                />
                <ToggleSwitch
                  label="显示所在地"
                  description="在个人主页显示你的所在地"
                  icon={MapPin}
                  checked={privacySettings.showLocation}
                  onChange={(v) => setPrivacySettings({ ...privacySettings, showLocation: v })}
                  disabled={!privacySettings.profilePublic}
                />
                <ToggleSwitch
                  label="显示网站"
                  description="在个人主页显示你的个人网站"
                  icon={LinkIcon}
                  checked={privacySettings.showWebsite}
                  onChange={(v) => setPrivacySettings({ ...privacySettings, showWebsite: v })}
                  disabled={!privacySettings.profilePublic}
                />
              </div>

              {/* 互动权限 */}
              <div className="space-y-2 bg-cyber-muted/20 p-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                <div className="px-4 py-2 text-sm font-medium text-cyber-muted-foreground font-mono">{'>'} 互动权限</div>
                <ToggleSwitch
                  label="允许评论"
                  description="允许其他用户评论你的分享"
                  icon={MessageSquare}
                  checked={privacySettings.allowComment}
                  onChange={(v) => setPrivacySettings({ ...privacySettings, allowComment: v })}
                />
              </div>

              {/* 显示控制 */}
              <div className="space-y-2 bg-cyber-muted/20 p-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                <div className="px-4 py-2 text-sm font-medium text-cyber-muted-foreground font-mono">{'>'} 主页显示控制</div>
                <ToggleSwitch
                  label="显示统计数据"
                  description="在个人主页展示分享数、获赞数、关注数（关闭后他人看不到这些数据）"
                  icon={BarChart3}
                  checked={privacySettings.showStats}
                  onChange={(v) => setPrivacySettings({ ...privacySettings, showStats: v })}
                />
                {!privacySettings.showStats && (
                  <div className="mx-4 mb-3 p-3 bg-neon-cyan/5 border border-neon-cyan/20 flex items-start gap-2"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                    <Eye className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-cyber-muted-foreground font-mono">
                      其他用户访问你的主页时，将看到"该用户隐藏了统计数据"提示
                    </p>
                  </div>
                )}
              </div>

              {/* 预览提示 */}
              <div className="bg-neon-cyan/10 border border-neon-cyan/30 p-4"
                style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-neon-cyan mt-0.5" />
                  <div>
                    <div className="font-orbitron font-medium text-cyber-foreground">预览效果</div>
                    <div className="text-sm text-cyber-muted-foreground mt-1 font-mono">
                      {'>'} 其他用户看到的你的资料：
                      {privacySettings.profilePublic ? (
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          <li>用户名、头像、简介：可见</li>
                          <li>邮箱：{privacySettings.showEmail ? '可见' : '隐藏'}</li>
                          <li>所在地：{privacySettings.showLocation ? '可见' : '隐藏'}</li>
                          <li>网站：{privacySettings.showWebsite ? '可见' : '隐藏'}</li>
                          <li>统计数据：{privacySettings.showStats ? '可见（分享/获赞/关注）' : '隐藏'}</li>
                        </ul>
                      ) : (
                        <span className="block mt-1">个人资料已隐藏</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={savePrivacySettings}
                disabled={saving}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#0a0a0f] font-orbitron font-bold hover:shadow-[0_0_24px_rgba(0,255,136,0.35)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wider"
                style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</> : '保存设置 →'}
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <h3 className="font-orbitron font-semibold text-cyber-foreground">账号设置</h3>
        <div className="space-y-3">
          <SettingCard
            title="修改密码"
            description="定期修改密码保护账号安全"
            icon={Lock}
            color="bg-neon-cyan/20 text-neon-cyan"
            onClick={() => setActiveSetting('password')}
          />
          <SettingCard
            title="通知设置"
            description="管理邮件和站内通知"
            icon={Bell}
            color="bg-neon-green/20 text-neon-green"
            onClick={() => setActiveSetting('notifications')}
          />
          <SettingCard
            title="隐私设置"
            description="控制个人信息的可见性"
            icon={Shield}
            color="bg-neon-magenta/20 text-neon-magenta"
            onClick={() => setActiveSetting('privacy')}
          />
          {/* 危险操作区域 */}
          <div className="pt-6 border-t border-neon-red/20">
            <h4 className="font-orbitron font-semibold text-neon-red mb-3 text-sm tracking-wider">{'>'} 危险区域</h4>
            <SettingCard
              title="注销账户"
              description="永久删除账户及其所有数据"
              icon={AlertTriangle}
              color="bg-neon-red/15 text-neon-red"
              onClick={() => setShowDeleteModal(true)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-20 text-cyber-foreground font-mono">{'>'} 加载中...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-cyber-background">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-cyber-card border border-cyber-border p-8 relative"
            style={{ clipPath: 'polygon(0 20px, 20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px))' }}>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-cyan" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-cyan" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-cyan" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-cyan" />
            
            <div className="w-16 h-16 bg-neon-cyan/10 border border-neon-cyan flex items-center justify-center mx-auto mb-4"
              style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
              <User className="w-8 h-8 text-neon-cyan" />
            </div>
            <h2 className="text-xl font-orbitron font-bold text-cyber-foreground mb-2">请先登录</h2>
            <p className="text-cyber-muted-foreground mb-6 font-mono">{'>'} 登录后查看你的个人中心</p>
            <Link
              href="/login"
              className="inline-block bg-neon-cyan text-cyber-background px-8 py-3 font-orbitron font-semibold hover:shadow-neon-cyan transition-all"
              style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
            >
              去登录
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // 统计数据
  const stats = [
    { label: '我的提交', value: submittedToolsTotal, icon: Share2, tab: 'shares' },
    { label: '我的点赞', value: likedTools.length, icon: ThumbsUp, tab: 'likedTools' },
    { label: '我的收藏', value: favorites.length, icon: Bookmark, tab: 'favorites' },
    { label: '收藏分享', value: favoriteShares.length, icon: Heart, tab: 'favoriteShares' },
    { label: '通知', value: unreadCount, icon: Bell, tab: 'notifications' },
  ]

  return (
    <div className="min-h-screen bg-cyber-background">
      {/* 修复 Chrome autofill 黄色背景 */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #12121a inset !important;
          box-shadow: 0 0 0 1000px #12121a inset !important;
          -webkit-text-fill-color: #e0e0e0 !important;
          caret-color: #e0e0e0 !important;
        }
      `}</style>
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧个人信息 */}
          <div className="lg:col-span-1">
            <div className="bg-cyber-card border border-cyber-border p-6 sticky top-20 relative"
              style={{ clipPath: 'polygon(0 20px, 20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px))' }}>
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-cyan" />
              <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-cyan" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-cyan" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-cyan" />
              
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <Avatar
                    userId={user.id}
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                    size="xxl"
                  />
                </div>
                <h1 className="text-lg font-orbitron font-bold text-cyber-foreground">{user.username}</h1>
                <p className="text-cyber-muted-foreground text-sm font-mono">{user.email}</p>
              </div>

              {user.bio && (
                <p className="text-cyber-muted-foreground text-sm text-center mb-4 font-mono">{user.bio}</p>
              )}

              <div className="space-y-2 text-sm text-cyber-muted-foreground mb-6 font-mono">
                {user.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-neon-cyan" />
                    {user.location}
                  </div>
                )}
                {user.website && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-neon-cyan" />
                    <a href={user.website} target="_blank" className="text-neon-cyan hover:underline truncate">
                      {user.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neon-cyan" />
                  {'>'} 加入于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>

              <Link
                href="/user-center/edit"
                className="w-full flex items-center justify-center gap-2 py-2 border border-cyber-border text-cyber-foreground hover:border-neon-cyan hover:text-neon-cyan transition-colors mb-3 font-mono"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                <Edit3 className="w-4 h-4" />
                编辑资料
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-neon-red hover:bg-neon-red/10 transition-colors font-mono"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="lg:col-span-3">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {stats.map((stat) => (
                <button
                  key={stat.label}
                  onClick={() => setActiveTab(stat.tab)}
                  className={`text-left bg-cyber-card p-4 border transition-all ${
                    activeTab === stat.tab 
                      ? 'border-neon-cyan shadow-neon-cyan' 
                      : 'border-cyber-border hover:border-neon-cyan/50'
                  }`}
                  style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}
                >
                  <div className="flex items-center gap-2 text-cyber-muted-foreground mb-1">
                    <stat.icon className={`w-4 h-4 ${activeTab === stat.tab ? 'text-neon-cyan' : ''}`} />
                    <span className="text-xs font-mono">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-orbitron font-bold text-cyber-foreground">{stat.value}</div>
                </button>
              ))}
            </div>

            {/* 标签页 */}
            <div className="bg-cyber-card border border-cyber-border">
              <div className="border-b border-cyber-border">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'shares', label: '我的提交', icon: Share2 },
                    { id: 'likedTools', label: '我的点赞', icon: ThumbsUp },
                    { id: 'favorites', label: '我的收藏', icon: Bookmark },
                    { id: 'favoriteShares', label: '收藏分享', icon: Heart },
                    { id: 'notifications', label: '通知', icon: Bell },
                    { id: 'settings', label: '设置', icon: Settings },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap font-mono ${
                        activeTab === tab.id
                          ? 'border-neon-cyan text-neon-cyan'
                          : 'border-transparent text-cyber-muted-foreground hover:text-cyber-foreground'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.id === 'notifications' && unreadCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-neon-green/20 text-neon-green border border-neon-green/30 font-mono"
                          style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'shares' && (
                  <div>
                    {submittedToolsLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-2 border-neon-cyan border-t-transparent animate-spin" 
                          style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }} />
                        <p className="text-cyber-muted-foreground mt-2 font-mono">{'>'} 加载中...</p>
                      </div>
                    ) : submittedTools.length === 0 ? (
                      <EmptyState
                        icon={Share2}
                        title="还没有提交过工具"
                        description="提交你发现的好工具，帮助更多人"
                        action={{ label: '去提交', href: '/submit' }}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <SearchBar placeholder="搜索我的提交..." />
                          <ViewToggle />
                        </div>
                        {(() => {
                          const { pagedItems, totalPages, totalCount } = getFilteredAndPagedItems(submittedTools, 'name')
                          return (
                            <>
                              <div className={viewMode === 'grid' 
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
                                : 'space-y-3'
                              }>
                                {pagedItems.map((tool) => (
                                  <SubmittedToolCard key={tool.id} tool={tool} />
                                ))}
                              </div>
                              <Pagination totalPages={totalPages} totalCount={totalCount} />
                            </>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'likedTools' && (
                  <div>
                    {likedTools.length === 0 ? (
                      <EmptyState
                        icon={ThumbsUp}
                        title="还没有点赞过任何工具"
                        description="发现喜欢的工具就点个赞吧"
                        action={{ label: '去发现', href: '/tools' }}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <SearchBar placeholder="搜索点赞的工具..." />
                          <ViewToggle />
                        </div>
                        {(() => {
                          const { pagedItems, totalPages, totalCount } = getFilteredAndPagedItems(likedTools, 'name')
                          return (
                            <>
                              <div className={viewMode === 'grid' 
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
                                : 'space-y-3'
                              }>
                                {pagedItems.map((tool) => (
                                  <ToolCard
                                    key={tool.id}
                                    tool={tool}
                                    onRemove={() => removeLike(tool.id)}
                                    removeLabel="取消点赞"
                                  />
                                ))}
                              </div>
                              <Pagination totalPages={totalPages} totalCount={totalCount} />
                            </>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'favorites' && (
                  <div>
                    {favorites.length === 0 ? (
                      <EmptyState
                        icon={Bookmark}
                        title="还没有收藏任何工具"
                        description="收藏喜欢的工具，方便以后查找"
                        action={{ label: '去发现', href: '/tools' }}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <SearchBar placeholder="搜索收藏的工具..." />
                          <ViewToggle />
                        </div>
                        {(() => {
                          const { pagedItems, totalPages, totalCount } = getFilteredAndPagedItems(favorites, 'name')
                          return (
                            <>
                              <div className={viewMode === 'grid' 
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
                                : 'space-y-3'
                              }>
                                {pagedItems.map((tool) => (
                                  <ToolCard
                                    key={tool.id}
                                    tool={tool}
                                    onRemove={() => removeFavorite(tool.id)}
                                    removeLabel="取消收藏"
                                  />
                                ))}
                              </div>
                              <Pagination totalPages={totalPages} totalCount={totalCount} />
                            </>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'favoriteShares' && (
                  <div>
                    {favoriteShares.length === 0 ? (
                      <EmptyState
                        icon={Heart}
                        title="还没有收藏任何分享"
                        description="收藏感兴趣的分享，随时回看"
                        action={{ label: '去发现', href: '/user-share' }}
                      />
                    ) : (
                      <>
                        <SearchBar placeholder="搜索收藏的分享..." />
                        {(() => {
                          const { pagedItems, totalPages, totalCount } = getFilteredAndPagedItems(favoriteShares, 'content')
                          return (
                            <>
                              <div className="space-y-4">
                                {pagedItems.map((share) => (
                                  <ShareCard
                                    key={share.id}
                                    share={share}
                                    onRemove={() => removeFavoriteShare(share.id)}
                                  />
                                ))}
                              </div>
                              <Pagination totalPages={totalPages} totalCount={totalCount} />
                            </>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div>
                    {/* 通知头部 - 全部已读按钮 */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-cyber-muted-foreground font-mono">
                        <span className="text-neon-green">{unreadCount}</span> 条未读 · 共 {notifTotal} 条
                      </p>
                      {notifList.some((n: any) => !n.isRead) && (
                        <button
                          onClick={handleMarkAllNotifRead}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-cyber-border text-cyber-foreground hover:text-neon-green hover:border-neon-green transition-all"
                          style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          全部已读
                        </button>
                      )}
                    </div>

                    {/* 通知列表 */}
                    {notifLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-2 border-neon-cyan border-t-transparent animate-spin"
                          style={{ clipPath: 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' }} />
                        <p className="text-cyber-muted-foreground mt-2 font-mono">{'>'} 加载中...</p>
                      </div>
                    ) : notifList.length === 0 ? (
                      <EmptyState
                        icon={Bell}
                        title="暂无通知"
                        description="当有人与你互动时，通知会出现在这里"
                      />
                    ) : (
                      <>
                        <div className="space-y-1">
                          {notifList.map((n: any) => {
                            const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
                              like:    { icon: Heart,        color: '#ff3366',   bg: 'rgba(255,51,102,0.1)' },
                              comment: { icon: MessageCircle, color: '#00d4ff',   bg: 'rgba(0,212,255,0.1)'  },
                              follow:  { icon: UserPlus,      color: '#00ff88',   bg: 'rgba(0,255,136,0.1)'  },
                              system:  { icon: Info,          color: '#f59e0b',   bg: 'rgba(245,158,11,0.1)' },
                            }
                            const cfg = typeConfig[n.type] || typeConfig.system
                            const Icon = cfg.icon
                            const timeAgo = (dateStr: string) => {
                              const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
                              if (diff < 60) return '刚刚'
                              if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
                              if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
                              if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
                              return new Date(dateStr).toLocaleDateString('zh-CN')
                            }
                            return (
                              <div
                                key={n.id}
                                className={`group relative flex items-start gap-3 p-3 border transition-all duration-200 ${
                                  n.isRead
                                    ? 'bg-cyber-card/50 border-cyber-border/50'
                                    : 'bg-cyber-card border-neon-green/30 shadow-[inset_0_0_15px_rgba(0,255,136,0.05)]'
                                }`}
                                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                              >
                                {!n.isRead && (
                                  <span className="absolute top-3 left-3 w-2 h-2 bg-neon-green rounded-full animate-pulse" style={{ boxShadow: '0 0 6px #00ff88' }} />
                                )}
                                <div
                                  className={`flex-shrink-0 w-9 h-9 flex items-center justify-center ${n.isRead ? 'opacity-50' : ''}`}
                                  style={{ background: cfg.bg, clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                                >
                                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className={`text-xs font-mono ${n.isRead ? 'text-cyber-muted-foreground' : 'text-cyber-foreground font-bold'}`}>
                                        {n.title}
                                      </p>
                                      {n.content && (
                                        <p className="text-[11px] text-cyber-muted-foreground mt-0.5 font-mono line-clamp-2">
                                          {n.content}
                                        </p>
                                      )}
                                    </div>
                                    {!n.isRead && (
                                      <button
                                        onClick={() => handleMarkNotifRead(n.id)}
                                        disabled={notifMarking === n.id}
                                        className="p-1 text-cyber-muted-foreground hover:text-neon-green opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                      >
                                        {notifMarking === n.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Check className="w-3 h-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1 text-[10px] text-cyber-muted-foreground font-mono">
                                      <Clock className="w-2.5 h-2.5" />
                                      {timeAgo(n.createdAt)}
                                    </span>
                                    {n.link && (
                                      <Link
                                        href={n.link}
                                        className="text-[10px] font-mono text-neon-cyan hover:text-neon-green underline-offset-2 hover:underline transition-colors"
                                        onClick={() => !n.isRead && handleMarkNotifRead(n.id)}
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
                        {/* 分页 */}
                        {(() => {
                          const totalPages = Math.ceil(notifTotal / PAGE_SIZE_NOTIF)
                          if (totalPages <= 1) return null
                          return (
                            <div className="flex items-center justify-center gap-3 mt-6">
                              <button
                                onClick={() => setNotifPage(p => Math.max(1, p - 1))}
                                disabled={notifPage <= 1}
                                className="p-1.5 border border-cyber-border text-cyber-foreground hover:text-neon-green hover:border-neon-green transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-mono text-cyber-muted-foreground">
                                <span className="text-neon-green">{notifPage}</span> / {totalPages}
                              </span>
                              <button
                                onClick={() => setNotifPage(p => Math.min(totalPages, p + 1))}
                                disabled={notifPage >= totalPages}
                                className="p-1.5 border border-cyber-border text-cyber-foreground hover:text-neon-green hover:border-neon-green transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <SettingsPanel user={user} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* 注销账户确认弹窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0a0f] border border-neon-red/40 w-full max-w-md mx-4 relative"
            style={{ clipPath: 'polygon(0 20px, 20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px))' }}>
            
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-red" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-red" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-red" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-red" />

            <div className="p-6 space-y-5">
              {/* 警告图标 */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-neon-red/15 border border-neon-red/30 flex items-center justify-center flex-shrink-0"
                  style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                  <AlertTriangle className="w-6 h-6 text-neon-red" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-neon-red text-lg">注销账户</h3>
                  <p className="text-sm text-cyber-muted-foreground font-mono">{'>'} 此操作不可恢复</p>
                </div>
              </div>

              {/* 警告内容 */}
              <div className="bg-neon-red/5 border border-neon-red/20 p-4 space-y-2"
                style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
                <p className="text-sm text-cyber-foreground font-mono font-medium">{'>'} 注销后将会永久删除以下数据：</p>
                <ul className="text-sm text-cyber-muted-foreground font-mono space-y-1 list-disc list-inside">
                  <li>所有发布的分享</li>
                  <li>所有评论和回复</li>
                  <li>所有收藏和点赞</li>
                  <li>个人资料和设置</li>
                </ul>
                <p className="text-xs text-neon-red font-mono mt-2">{'>'} 注销后邮箱可重新注册使用</p>
              </div>

              {/* 密码验证 */}
              <div className="space-y-2">
                {user?.githubId ? (
                  <div className="bg-neon-green/5 border border-neon-green/20 p-3 text-center"
                    style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
                    <p className="text-sm text-neon-green font-mono">{'>'} GitHub 用户直接确认即可注销</p>
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-orbitron text-cyber-foreground">请输入密码确认</label>
                    <div className="relative">
                      <input
                        type={showDeletePassword ? 'text' : 'password'}
                        value={deletePassword}
                        onChange={(e) => { setDeletePassword(e.target.value); setDeleteError('') }}
                        placeholder="输入当前密码确认注销"
                        className="w-full px-4 py-3 bg-[#12121a] border border-cyber-border text-cyber-foreground font-mono text-sm outline-none focus:border-neon-red/60 transition-colors pr-10"
                        style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted-foreground hover:text-neon-green transition-colors"
                      >
                        {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </>
                )}
                {deleteError && (
                  <p className="text-xs text-neon-red font-mono">{deleteError}</p>
                )}
              </div>

              {/* 按钮组 */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletePassword('')
                    setDeleteError('')
                    setShowDeletePassword(false)
                  }}
                  className="flex-1 py-3 border border-cyber-border text-cyber-foreground hover:border-cyber-muted-foreground transition-colors font-mono text-sm"
                  style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (!user?.githubId && !deletePassword) {
                      setDeleteError('请输入密码')
                      return
                    }
                    setDeleteLoading(true)
                    setDeleteError('')
                    try {
                      const res = await fetch('/api/user/delete-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user?.id, password: deletePassword })
                      })
                      const data = await res.json()
                      if (res.ok) {
                        localStorage.removeItem('user')
                        localStorage.removeItem('sessionToken')
                        router.push('/')
                        router.refresh()
                      } else {
                        setDeleteError(data.error || '注销失败')
                      }
                    } catch (e) {
                      setDeleteError('网络错误，请稍后重试')
                    } finally {
                      setDeleteLoading(false)
                    }
                  }}
                  disabled={deleteLoading}
                  className="flex-1 py-3 bg-neon-red text-white font-orbitron font-bold hover:bg-neon-red/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> 注销中...</> : '确认注销 →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
