'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, MapPin, Link as LinkIcon, Calendar,
  Share2, Heart, MessageCircle,
  ArrowLeft, Loader2, Settings,
  Edit3, Users, X, ChevronRight, Trophy
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Avatar from '@/components/Avatar'
import AchievementWall from '@/components/AchievementWall'
import { getShareImages } from '@/lib/share-image'

interface UserProfileData {
  id: number
  username: string
  avatarUrl: string | null
  bio: string | null
  email?: string | null
  location?: string | null
  website?: string | null
  role?: string
  createdAt: string
  allowComment?: boolean
  showStats?: boolean
  shareCount?: number
  totalLikes?: number
}

interface ShareItem {
  id: number
  content: string
  images: string[] | null
  likes: number
  status: string
  type: string
  createdAt: string
  tool: {
    name: string
    slug: string | null
    shortDesc: string | null
    category: { name: string; slug: string } | null
  } | null
  _count: { comments: number }
}

// 根据字符串生成一致的颜色
function stringToColor(str: string): string {
  if (!str) return '#3B82F6'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#14B8A6', '#F97316', '#84CC16', '#EF4444']
  return colors[Math.abs(hash) % colors.length]
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const targetUserId = params.id as string

  // 当前登录用户信息
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // 目标用户资料
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSelf, setIsSelf] = useState(false)
  
  // 关注相关
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [achievementCount, setAchievementCount] = useState(0)
  
  // 用户内容
  const [shares, setShares] = useState<ShareItem[]>([])
  const [sharesLoading, setSharesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'shares' | 'achievements'>('shares')
  
  // 错误状态
  const [error, setError] = useState<string | null>(null)

  // 弹窗状态
  const [likesModalOpen, setLikesModalOpen] = useState(false)
  const [likesList, setLikesList] = useState<any[]>([])
  const [likesLoading, setLikesLoading] = useState(false)

  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followTab, setFollowTab] = useState<'followers' | 'following'>('followers')
  const [followList, setFollowList] = useState<any[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (targetUserId) {
      loadProfile(targetUserId)
      loadShares(targetUserId)
      
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser)
          setIsSelf(parsed.id === parseInt(targetUserId))
        } catch {}
      }

      // 加载关注数量（始终加载）
      loadFollowCount(targetUserId)

      // 检查关注状态（仅登录用户）
      const savedU = localStorage.getItem('user')
      if (savedU && targetUserId) {
        try {
          const parsed = JSON.parse(savedU)
          checkFollowStatus(parsed.id, parseInt(targetUserId))
        } catch {}
      }
    }
  }, [targetUserId])

  const loadProfile = async (userId: string) => {
    try {
      const viewerId = currentUser?.id || ''
      const res = await fetch(`/api/user/profile/${userId}${viewerId ? `?viewerId=${viewerId}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data.user || data)
        // 加载成就数量
        fetch(`/api/user/achievements?userId=${userId}`)
          .then(r => r.json())
          .then(d => setAchievementCount(d.unlockedCount || 0))
          .catch(() => {})
      } else {
        const err = await res.json()
        setError(err.error || '用户不存在')
      }
    } catch (e) {
      console.error('加载用户资料失败:', e)
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const loadShares = async (userId: string) => {
    setSharesLoading(true)
    try {
      const res = await fetch(`/api/user/shares?userId=${userId}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setShares(data.shares || [])
      }
    } catch (e) {
      console.error('加载用户分享失败:', e)
    } finally {
      setSharesLoading(false)
    }
  }

  const loadFollowCount = async (userId: string) => {
    try {
      const res = await fetch(`/api/user/follow?userId=${userId}&type=count`)
      if (res.ok) {
        const data = await res.json()
        setFollowerCount(data.followers || 0)
        setFollowingCount(data.following || 0)
      }
    } catch (e) {
      console.error('获取关注数失败:', e)
    }
  }

  const checkFollowStatus = async (myId: number, targetId: number) => {
    try {
      const res = await fetch(`/api/user/follow?userId=${myId}&targetId=${targetId}&type=status`)
      if (res.ok) {
        const data = await res.json()
        setIsFollowing(data.following)
      }
    } catch (e) {}
  }

  // 关注/取消关注
  const handleFollowToggle = async () => {
    if (!currentUser || followLoading) return

    setFollowLoading(true)
    try {
      const res = await fetch('/api/user/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: currentUser.id,
          followingId: profile?.id,
        })
      })

      if (res.ok) {
        const data = await res.json()
        setIsFollowing(data.following)
        // 更新粉丝计数
        setFollowerCount(prev => data.following ? prev + 1 : Math.max(0, prev - 1))
      }
    } catch (e) {
      console.error('关注操作失败:', e)
    } finally {
      setFollowLoading(false)
    }
  }

  // 打开获赞弹窗
  const openLikesModal = async () => {
    setLikesModalOpen(true)
    setLikesLoading(true)
    try {
      const res = await fetch(`/api/user/${targetUserId}/likes?limit=20`)
      if (res.ok) {
        const data = await res.json()
        setLikesList(data.likes || [])
      }
    } catch (e) {
      console.error('获取获赞详情失败:', e)
    } finally {
      setLikesLoading(false)
    }
  }

  // 打开关注/粉丝弹窗
  const openFollowModal = async (tab: 'followers' | 'following') => {
    setFollowTab(tab)
    setFollowModalOpen(true)
    setFollowListLoading(true)
    try {
      const res = await fetch(`/api/user/follow?userId=${targetUserId}&type=list&listType=${tab}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setFollowList(data.users || [])
      }
    } catch (e) {
      console.error('获取关注列表失败:', e)
    } finally {
      setFollowListLoading(false)
    }
  }

  // 切换关注弹窗 tab
  const switchFollowTab = async (tab: 'followers' | 'following') => {
    setFollowTab(tab)
    setFollowListLoading(true)
    try {
      const res = await fetch(`/api/user/follow?userId=${targetUserId}&type=list&listType=${tab}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setFollowList(data.users || [])
      }
    } catch (e) {
      console.error('获取关注列表失败:', e)
    } finally {
      setFollowListLoading(false)
    }
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center text-cyber-muted-foreground font-mono flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            加载中...
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // 错误/不存在
  if (error && !profile) {
    return (
      <div className="min-h-screen bg-cyber-background">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-cyber-card border border-cyber-border p-8"
            style={{ clipPath: 'polygon(0 15px, 15px 0, calc(100% - 15px) 0, 100% 15px, 100% calc(100% - 15px), calc(100% - 15px) 100%, 15px 100%, 0 calc(100% - 15px))' }}>
            <User className="w-16 h-16 text-neon-cyan mx-auto mb-4" />
            <h2 className="text-xl font-bold text-cyber-foreground mb-2 font-orbitron">{error}</h2>
            <p className="text-cyber-muted-foreground mb-6 font-mono">该用户可能不存在或已被封禁</p>
            <Link href="/user-share" className="inline-flex items-center gap-2 px-6 py-3 bg-neon-cyan text-cyber-background hover:bg-neon-cyan/90 transition-colors font-mono"
              style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}>
              <ArrowLeft className="w-4 h-4" />
              返回社区
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!profile) return null

  // 统计数据（从 profile API 获取，不依赖前端 shares 数组）
  const shareCount = profile?.shareCount ?? 0
  const totalLikes = profile?.totalLikes ?? 0

  // 是否显示统计栏（自己看总是显示；别人看取决于 showStats 设置）
  const showStatsBar = isSelf || !!profile.showStats

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4">
        {/* ====== B站风格：顶部封面横幅 ====== */}
        <div className="relative mt-4 rounded-lg overflow-hidden">
          {/* 封面图区域 */}
          <div className="h-36 sm:h-44 md:h-52 relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
            {/* 赛博朋克网格纹理 */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,255,136,.15) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,255,136,.15) 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px'
              }}
            />
            {/* 扫描线效果 */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,.05) 2px, rgba(0,212,255,.05) 4px)'
              }}
            />
            {/* 左上角装饰线 */}
            <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-neon-green/40" />
            {/* 右下角装饰 */}
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-neon-magenta/30" />
            
            {/* 封面底部渐变 */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cyber-card to-transparent" />
          </div>

          {/* ====== 信息主体区 ====== */}
          <div className="bg-cyber-card border-x border-b border-cyber-border pb-0">
            <div className="px-5 sm:px-8">
              {/* 头像 - 悬浮在封面和信息的交界处 */}
              <div className="relative -mt-14 sm:-mt-16 mb-3">
                <Avatar
                  userId={profile.id}
                  username={profile.username}
                  avatarUrl={profile.avatarUrl}
                  size="xxl"
                  isAI={false}
                  badgeCount={achievementCount || undefined}
                />
              </div>

              {/* 第一行：用户名 + 操作按钮 */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-cyber-foreground">
                    {profile.username}
                  </h1>
                  {(profile.role === 'ADMIN') && (
                    <span className="px-2 py-0.5 bg-neon-red text-[#0a0a0f] text-xs font-bold font-mono"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}>
                      管理员
                    </span>
                  )}
                  {isSelf && (
                    <span className="px-2 py-0.5 bg-neon-cyan/20 text-neon-cyan text-xs font-mono border border-neon-cyan/30"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}>
                      我
                    </span>
                  )}
                </div>

                {/* 操作按钮组 */}
                <div className="flex items-center gap-2">
                  {isSelf ? (
                    <Link href="/user-center/edit" 
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/25 transition-all duration-200 text-sm font-mono"
                      style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                      <Edit3 className="w-3.5 h-3.5" />
                      编辑资料
                    </Link>
                  ) : (
                    <>
                      <button 
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`inline-flex items-center justify-center gap-1.5 px-6 py-2 font-bold font-mono text-sm transition-all duration-200 ${
                          isFollowing 
                            ? 'bg-cyber-muted/40 text-cyber-foreground/70 border border-cyber-border hover:bg-neon-red/20 hover:text-neon-red hover:border-neon-red/40' 
                            : 'bg-neon-green text-[#0a0a0f] hover:bg-neon-green/85'
                        }`}
                        style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                        {followLoading ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /></>
                        ) : isFollowing ? (
                          <>已关注</>
                        ) : (
                          <>+ 关注</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 第二行：简介 */}
              <div className="mt-3 mb-3 min-h-[44px]">
                {profile.bio ? (
                  <p className="text-sm text-cyber-foreground/75 leading-relaxed font-mono max-w-2xl">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-cyber-muted-foreground/40 italic font-mono">这个人很懒，什么都没写~</p>
                )}
              </div>

              {/* 第三行：元信息 */}
              <div className="flex items-center gap-4 flex-wrap text-xs text-cyber-muted-foreground font-mono pb-3">
                {profile.location && (
                  <span className="flex items-center gap-1 hover:text-neon-cyan transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-neon-cyan/60" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-neon-cyan transition-colors">
                    <LinkIcon className="w-3.5 h-3.5 text-neon-cyan/60" />
                    {profile.website.replace(/^https?:\/\/(www\.)?/, '')} ↗
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neon-magenta/60" />
                  {new Date(profile.createdAt).toLocaleDateString('zh-CN')} 加入
                </span>
              </div>
            </div>

            {/* ====== 统计数据栏 ====== */}
            {showStatsBar && (
              <div className="border-t border-cyber-border">
                <div className="grid grid-cols-3 divide-x divide-cyber-border">
                  <button 
                    onClick={() => setActiveTab('shares')}
                    className={`py-3.5 text-center transition-all duration-200 group ${activeTab === 'shares' ? 'bg-neon-green/5' : 'hover:bg-cyber-muted/30'}`}>
                    <div className={`text-xl sm:text-2xl font-orbitron font-bold ${activeTab === 'shares' ? 'text-neon-green' : 'text-cyber-foreground group-hover:text-neon-green'} transition-colors`}>
                      {shareCount}
                    </div>
                    <div className={`text-xs mt-0.5 font-mono ${activeTab === 'shares' ? 'text-neon-green/70' : 'text-cyber-muted-foreground'}`}>
                      分享
                    </div>
                  </button>
                  
                  <button 
                    onClick={openLikesModal}
                    className="py-3.5 text-center hover:bg-cyber-muted/30 transition-colors cursor-pointer group w-full">
                    <div className="text-xl sm:text-2xl font-orbitron font-bold text-cyber-foreground group-hover:text-neon-magenta transition-colors">
                      {totalLikes}
                    </div>
                    <div className="text-xs mt-0.5 text-cyber-muted-foreground font-mono">获赞</div>
                  </button>
                  
                  <button 
                    onClick={() => openFollowModal('followers')}
                    className="py-3.5 text-center hover:bg-cyber-muted/30 transition-colors cursor-pointer group w-full">
                    <div className="text-xl sm:text-2xl font-orbitron font-bold text-cyber-foreground group-hover:text-neon-cyan transition-colors">
                      {followerCount}
                    </div>
                    <div className="text-xs mt-0.5 text-cyber-muted-foreground font-mono">关注</div>
                  </button>
                </div>
              </div>
            )}

            {!showStatsBar && !isSelf && (
              <div className="border-t border-cyber-border py-3 text-center">
                <p className="text-xs text-cyber-muted-foreground/50 font-mono flex items-center justify-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  该用户隐藏了统计数据
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ====== 内容标签页（B站风格）====== */}
        <div className="mt-4 pb-8">
          {/* 标签头 */}
          <div className="border-b border-cyber-border flex gap-0">
            <button
              onClick={() => setActiveTab('shares')}
              className={`relative px-6 py-3.5 text-sm font-medium transition-colors font-mono ${
                activeTab === 'shares'
                  ? 'text-neon-green'
                  : 'text-cyber-muted-foreground hover:text-cyber-foreground'
              }`}>
              <span className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                TA的动态
              </span>
              {activeTab === 'shares' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`relative px-6 py-3.5 text-sm font-medium transition-colors font-mono ${
                activeTab === 'achievements'
                  ? 'text-neon-green'
                  : 'text-cyber-muted-foreground hover:text-cyber-foreground'
              }`}>
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                成就 {achievementCount > 0 && `(${achievementCount})`}
              </span>
              {activeTab === 'achievements' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green" />
              )}
            </button>
          </div>

          {/* 内容列表 */}
          <div className="min-h-[300px]">
            {activeTab === 'shares' && (
              sharesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-neon-green" />
                </div>
              ) : shares.filter(s => s.status === 'approved').length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cyber-muted/20 flex items-center justify-center">
                    <Share2 className="w-8 h-8 text-cyber-muted-foreground/30" />
                  </div>
                  <p className="text-cyber-muted-foreground font-mono mb-1">还没有发布过任何动态</p>
                  <p className="text-xs text-cyber-muted-foreground/40 font-mono">快去分享你的第一个AI工具吧！</p>
                </div>
              ) : (
                <div className="divide-y divide-cyber-border/50">
                  {shares.filter(s => s.status === 'approved').map((share) => (
                    <ShareCard key={share.id} share={share} profileUsername={profile.username} profileAvatarUrl={profile.avatarUrl} />
                  ))}
                </div>
              )
            )}

            {activeTab === 'achievements' && (
              <div className="py-6 px-4">
                <AchievementWall userId={profile.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* ====== 获赞弹窗 ====== */}
      {likesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setLikesModalOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-lg bg-cyber-card border border-cyber-border max-h-[80vh] flex flex-col"
            style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}
            onClick={e => e.stopPropagation()}>
            {/* 弹窗头 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cyber-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-neon-magenta" />
                <h3 className="text-base font-orbitron font-bold text-cyber-foreground">获赞详情</h3>
                <span className="text-xs text-cyber-muted-foreground font-mono">共 {totalLikes} 赞</span>
              </div>
              <button onClick={() => setLikesModalOpen(false)} className="p-1.5 hover:bg-cyber-muted/30 transition-colors text-cyber-muted-foreground hover:text-cyber-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {likesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-magenta" />
                </div>
              ) : likesList.length === 0 ? (
                <div className="text-center py-10">
                  <Heart className="w-10 h-10 text-cyber-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-cyber-muted-foreground font-mono">还没有收到赞</p>
                </div>
              ) : (
                likesList.map((item: any) => (
                  <Link key={item.id} href={`/user-share?tab=tool#share-${item.id}`}
                    onClick={() => setLikesModalOpen(false)}
                    className="block p-3 bg-cyber-muted/10 border border-cyber-border/50 hover:border-neon-magenta/40 transition-colors group"
                    style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cyber-foreground/80 font-mono line-clamp-2 group-hover:text-neon-green transition-colors">
                          {item.content || '（无文字内容）'}
                        </p>
                        {item.tool && (
                          <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-mono">
                            {item.tool.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-neon-magenta flex-shrink-0">
                        <Heart className="w-3.5 h-3.5 fill-neon-magenta" />
                        <span className="text-sm font-orbitron font-bold">{item.likeCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-cyber-muted-foreground/50 font-mono">
                      <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                      {item.commentCount > 0 && <span>· {item.commentCount} 条评论</span>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== 关注/粉丝弹窗 ====== */}
      {followModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setFollowModalOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-lg bg-cyber-card border border-cyber-border max-h-[80vh] flex flex-col"
            style={{ clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }}
            onClick={e => e.stopPropagation()}>
            {/* 弹窗头 + Tab */}
            <div className="flex-shrink-0 border-b border-cyber-border">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-neon-cyan" />
                  <h3 className="text-base font-orbitron font-bold text-cyber-foreground">关注</h3>
                </div>
                <button onClick={() => setFollowModalOpen(false)} className="p-1.5 hover:bg-cyber-muted/30 transition-colors text-cyber-muted-foreground hover:text-cyber-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Tab 切换 */}
              <div className="flex border-t border-cyber-border">
                <button
                  onClick={() => switchFollowTab('followers')}
                  className={`flex-1 py-3 text-center text-sm font-mono transition-colors relative ${
                    followTab === 'followers' ? 'text-neon-cyan' : 'text-cyber-muted-foreground hover:text-cyber-foreground'
                  }`}>
                  粉丝 {followerCount}
                  {followTab === 'followers' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-neon-cyan" />}
                </button>
                <button
                  onClick={() => switchFollowTab('following')}
                  className={`flex-1 py-3 text-center text-sm font-mono transition-colors relative ${
                    followTab === 'following' ? 'text-neon-cyan' : 'text-cyber-muted-foreground hover:text-cyber-foreground'
                  }`}>
                  关注 {followingCount}
                  {followTab === 'following' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-neon-cyan" />}
                </button>
              </div>
            </div>
            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {followListLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                </div>
              ) : followList.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 text-cyber-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-cyber-muted-foreground font-mono">
                    {followTab === 'followers' ? '还没有粉丝' : '还没有关注任何人'}
                  </p>
                </div>
              ) : (
                followList.map((user: any) => (
                  <Link key={user.id} href={`/u/${user.id}`}
                    onClick={() => setFollowModalOpen(false)}
                    className="flex items-center gap-3 p-3 hover:bg-cyber-muted/10 transition-colors group rounded-sm">
                    <Avatar userId={user.id} username={user.username} avatarUrl={user.avatarUrl} size="md" isAI={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-orbitron font-medium text-cyber-foreground group-hover:text-neon-cyan transition-colors truncate">
                        {user.username}
                      </div>
                      {user.bio && (
                        <p className="text-xs text-cyber-muted-foreground font-mono mt-0.5 truncate">{user.bio}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyber-muted-foreground/30 group-hover:text-neon-cyan/60 transition-colors flex-shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ====== 动态卡片子组件（B站风格时间线）======
function ShareCard({ share, profileUsername, profileAvatarUrl }: { share: ShareItem; profileUsername: string; profileAvatarUrl: string | null }) {
  const shareImages = getShareImages(share.id, (share as any).images)

  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
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

  return (
    <Link href={`/user-share?tab=tool#share-${share.id}`} className="block group">
      <div className="p-4 sm:p-5 hover:bg-cyber-muted/10 transition-colors duration-200">
        {/* 头部：用户信息 + 时间 */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar
            userId={share.id}
            username={profileUsername}
            avatarUrl={profileAvatarUrl}
            size="sm"
            isAI={false}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-cyber-foreground font-orbitron group-hover:text-neon-green transition-colors">
              {profileUsername}
            </span>
          </div>
          <span className="text-xs text-cyber-muted-foreground font-mono flex-shrink-0">
            {getRelativeTime(share.createdAt)}
          </span>
        </div>

        {/* 内容文字 */}
        <p className="text-sm text-cyber-foreground/80 leading-relaxed mb-3 font-mono pl-11">
          {share.content.length > 200 ? share.content.slice(0, 200) + '...' : share.content}
        </p>

        {/* 配图 */}
        {shareImages.length > 0 && (
          <div className={`ml-11 grid gap-2 ${shareImages.length >= 3 ? 'grid-cols-3' : shareImages.length === 2 ? 'grid-cols-2' : ''}`}
            style={{ maxWidth: shareImages.length > 1 ? '320px' : '180px' }}>
            {shareImages.slice(0, 3).map((img: string, idx: number) => (
              <img 
                key={idx} 
                src={img} 
                alt="" 
                className="w-full h-24 sm:h-28 object-cover rounded border border-cyber-border/50 group-hover:border-neon-green/40 transition-colors" 
              />
            ))}
          </div>
        )}

        {/* 关联工具标签 */}
        {share.tool && (
          <div className="ml-11 mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 bg-cyber-muted/30 border border-cyber-border/50 rounded-sm group-hover:border-neon-cyan/40 transition-colors">
            <div
              className="w-6 h-6 flex items-center justify-center text-cyber-background font-bold text-xs flex-shrink-0 font-orbitron"
              style={{
                background: `linear-gradient(135deg, ${stringToColor(share.tool.name)} 0%, ${stringToColor(share.tool.name)}cc 100%)`,
              }}
            >
              {share.tool.name.charAt(0)}
            </div>
            <div>
              <span className="text-xs font-orbitron font-semibold text-cyber-foreground/90 group-hover:text-neon-cyan transition-colors">
                {share.tool.name}
              </span>
              {share.tool.category && (
                <span className="text-[10px] ml-1.5 px-1.5 py-0 bg-f59e0b/10 text-f59e0b border border-f59e0b/20 font-mono">
                  {share.tool.category.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 底部操作栏 */}
        <div className="ml-11 flex items-center gap-6 mt-3 pt-2 border-t border-cyber-border/30">
          <span className="flex items-center gap-1.5 text-xs text-cyber-muted-foreground font-mono hover:text-neon-magenta transition-colors cursor-pointer">
            <Heart className="w-3.5 h-3.5" /> {share.likes}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-cyber-muted-foreground font-mono hover:text-neon-cyan transition-colors cursor-pointer">
            <MessageCircle className="w-3.5 h-3.5" /> {share._count.comments}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ====== 工具项子组件 ======
function ToolItem({ share }: { share: ShareItem }) {
  if (!share.tool) return null
  
  return (
    <Link href={`/tools/${share.tool.slug}`} className="block group">
      <div className="flex items-center gap-4 p-4 sm:p-5 hover:bg-cyber-muted/10 transition-colors duration-200">
        <div
          className="w-12 h-12 flex items-center justify-center text-cyber-background font-bold text-lg flex-shrink-0 font-orbitron group-hover:scale-110 transition-transform duration-200"
          style={{
            background: `linear-gradient(135deg, ${stringToColor(share.tool.name)} 0%, ${stringToColor(share.tool.name)}cc 100%)`,
            borderRadius: '6px',
          }}
        >
          {share.tool.name.charAt(0)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-orbitron font-semibold text-cyber-foreground text-sm group-hover:text-neon-cyan transition-colors truncate">
            {share.tool.name}
          </div>
          <p className="text-xs text-cyber-muted-foreground mt-1 truncate font-mono">
            {share.tool.shortDesc || '暂无描述'}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {share.tool.category && (
              <span className="text-[10px] px-1.5 py-0.5 bg-f59e0b/10 text-f59e0b border border-f59e0b/20 font-mono rounded-sm">
                {share.tool.category.name}
              </span>
            )}
            <span className="text-[10px] text-cyber-muted-foreground font-mono">
              {new Date(share.createdAt).toLocaleDateString('zh-CN')} 提交
            </span>
          </div>
        </div>

        <ExternalLink className="w-4 h-4 text-cyber-muted-foreground group-hover:text-neon-cyan transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
      </div>
    </Link>
  )
}