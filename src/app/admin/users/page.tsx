'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, Search, RefreshCw, Loader2, Ban, Unlock, Shield,
  ChevronLeft, ChevronRight, Clock, User, MapPin, Link as LinkIcon,
  Calendar, X
} from 'lucide-react'

interface User {
  id: number
  username: string
  email: string | null
  avatarUrl: string | null
  bio: string | null
  location: string | null
  website: string | null
  role: string
  status: 'active' | 'banned'
  bannedAt: string | null
  bannedUntil: string | null
  bannedReason: string | null
  bannedBy: number | null
  createdAt: string
  updatedAt: string
}

function stringToColor(str: string): string {
  if (!str) return '#3B82F6'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1']
  return colors[Math.abs(hash) % colors.length]
}

// 获取首字母，过滤掉数字和非字母字符
function getInitial(str: string): string {
  if (!str) return '?'
  const firstChar = str.charAt(0).toUpperCase()
  if (/[A-Z]/.test(firstChar)) return firstChar
  const match = str.match(/[A-Za-z]/)
  return match ? match[0].toUpperCase() : '?'
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [stats, setStats] = useState({ active: 0, banned: 0, total: 0 })
  
  // 封禁弹窗状态
  const [showBanModal, setShowBanModal] = useState<number | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('permanent')
  const [processingBan, setProcessingBan] = useState(false)
  
  // 用户详情弹窗
  const [showDetailModal, setShowDetailModal] = useState<User | null>(null)
  const [userStats, setUserStats] = useState({ sharesCount: 0, commentsCount: 0, shareCommentsCount: 0 })
  const [loadingDetail, setLoadingDetail] = useState(false)

  const loadUsers = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', p.toString())
      params.append('limit', '20')
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setStats(data.stats || { active: 0, banned: 0, total: 0 })
      }
    } catch (err) {
      console.error('加载用户失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(1)
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    loadUsers(page)
  }, [page])

  const handleBan = async (userId: number) => {
    if (!banReason.trim()) return
    
    // 获取当前登录用户ID
    const userStr = localStorage.getItem('user')
    const currentUser = userStr ? JSON.parse(userStr) : null
    const adminId = currentUser?.id || null
    
    setProcessingBan(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban',
          reason: banReason,
          duration: banDuration,
          adminId: adminId
        })
      })
      
      if (res.ok) {
        setShowBanModal(null)
        setBanReason('')
        setBanDuration('permanent')
        loadUsers(page)
      }
    } catch (err) {
      console.error('封禁失败:', err)
    } finally {
      setProcessingBan(false)
    }
  }

  const handleUnban = async (userId: number) => {
    if (!confirm('确定要解封该用户吗？')) return
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' })
      })
      
      if (res.ok) {
        loadUsers(page)
      }
    } catch (err) {
      console.error('解封失败:', err)
    }
  }

  const viewUserDetail = async (user: User) => {
    setShowDetailModal(user)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setUserStats(data.stats || { sharesCount: 0, commentsCount: 0, shareCommentsCount: 0 })
      }
    } catch (err) {
      console.error('加载用户详情失败:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const getBanDurationText = (duration: string) => {
    const map: Record<string, string> = {
      '1d': '1天',
      '3d': '3天',
      '7d': '7天',
      '30d': '30天',
      '90d': '90天',
      '365d': '1年',
      'permanent': '永久'
    }
    return map[duration] || duration
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                ← 返回后台
              </Link>
              <h1 className="text-xl font-bold text-gray-900">用户管理</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: '正常用户', value: stats.active, color: 'green', icon: Users },
            { label: '封禁用户', value: stats.banned, color: 'red', icon: Ban },
            { label: '总计', value: stats.total, color: 'blue', icon: Shield },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={() => setStatusFilter(stat.label === '正常用户' ? 'active' : stat.label === '封禁用户' ? 'banned' : 'all')}
              className={`bg-white p-4 rounded-xl border-2 transition-all text-left ${
                (stat.label === '正常用户' && statusFilter === 'active') ||
                (stat.label === '封禁用户' && statusFilter === 'banned') ||
                (stat.label === '总计' && statusFilter === 'all')
                  ? `border-${stat.color}-500 ring-1 ring-${stat.color}-500`
                  : 'border-gray-300 hover:border-gray-400 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                <span className="text-gray-800 text-sm">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </button>
          ))}
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="搜索用户名或邮箱..."
              className="h-10 w-full pl-10 pr-4 py-0 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-800">状态:</span>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setPage(1) }}
              className="h-10 px-3 py-0 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部</option>
              <option value="active">正常</option>
              <option value="banned">封禁</option>
            </select>
          </div>
          <button
            onClick={() => loadUsers(page)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 用户列表 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无用户</h3>
            <p className="text-gray-500">没有找到符合条件的用户</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {users.map(user => (
                <div key={user.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* 头像 */}
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ background: stringToColor(user.username) }}
                        >
                          {getInitial(user.username)}
                        </div>
                      )}
                      
                      {/* 用户信息 */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{user.username}</span>
                          {user.status === 'banned' ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
                              <Ban className="w-3 h-3" />已封禁
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                              <Shield className="w-3 h-3" />正常
                            </span>
                          )}
                          {user.role === 'ADMIN' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                              管理员
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {user.email && <span className="mr-3">{user.email}</span>}
                          <span>注册于 {timeAgo(user.createdAt)}</span>
                        </div>
                        {user.status === 'banned' && user.bannedReason && (
                          <div className="text-sm text-red-600 mt-1">
                            封禁原因：{user.bannedReason}
                            {user.bannedUntil && (
                              <span className="text-red-500 ml-2">
                                (至 {new Date(user.bannedUntil).toLocaleDateString('zh-CN')})
                              </span>
                            )}
                            {!user.bannedUntil && (
                              <span className="text-red-500 ml-2">(永久)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewUserDetail(user)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        详情
                      </button>
                      {user.status === 'banned' ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"
                        >
                          <Unlock className="w-4 h-4" />
                          解封
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowBanModal(user.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          <Ban className="w-4 h-4" />
                          封禁
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  共 {total} 条，第 {page}/{totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-white border border-gray-400 disabled:opacity-50 hover:bg-gray-100 shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium ${
                          page === pageNum ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-400 text-gray-700 hover:bg-gray-100 shadow-sm'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg bg-white border border-gray-400 disabled:opacity-50 hover:bg-gray-100 shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 封禁弹窗 */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">封禁用户</h3>
            <p className="text-gray-500 text-sm mb-4">
              用户：{users.find(u => u.id === showBanModal)?.username}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">封禁原因</label>
                <textarea
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  placeholder="请输入封禁原因..."
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">封禁时长</label>
                <select
                  value={banDuration}
                  onChange={e => setBanDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="1d">1天</option>
                  <option value="3d">3天</option>
                  <option value="7d">7天</option>
                  <option value="30d">30天</option>
                  <option value="90d">90天</option>
                  <option value="365d">1年</option>
                  <option value="permanent">永久封禁</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowBanModal(null); setBanReason(''); setBanDuration('permanent') }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleBan(showBanModal)}
                disabled={processingBan || !banReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {processingBan ? <Loader2 className="w-4 h-4 animate-spin" /> : '确认封禁'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户详情弹窗 */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">用户详情</h3>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              {showDetailModal.avatarUrl ? (
                <img src={showDetailModal.avatarUrl} alt={showDetailModal.username} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: stringToColor(showDetailModal.username) }}
                >
                  {getInitial(showDetailModal.username)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900">{showDetailModal.username}</span>
                  {showDetailModal.status === 'banned' ? (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">已封禁</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">正常</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">ID: {showDetailModal.id}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">分享数</div>
                  <div className="text-xl font-bold text-gray-900">
                    {loadingDetail ? <Loader2 className="w-5 h-5 animate-spin" /> : userStats.sharesCount}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">评论数</div>
                  <div className="text-xl font-bold text-gray-900">
                    {loadingDetail ? <Loader2 className="w-5 h-5 animate-spin" /> : userStats.commentsCount + userStats.shareCommentsCount}
                  </div>
                </div>
              </div>

              {showDetailModal.email && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{showDetailModal.email}</span>
                </div>
              )}
              
              {showDetailModal.bio && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {showDetailModal.bio}
                </div>
              )}
              
              {showDetailModal.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {showDetailModal.location}
                </div>
              )}
              
              {showDetailModal.website && (
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                  <a href={showDetailModal.website} target="_blank" className="text-primary-600 hover:underline">
                    {showDetailModal.website}
                  </a>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                注册时间：{new Date(showDetailModal.createdAt).toLocaleString('zh-CN')}
              </div>

              {showDetailModal.status === 'banned' && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-700 mb-2">封禁信息</div>
                  <div className="text-sm text-red-600">原因：{showDetailModal.bannedReason}</div>
                  {showDetailModal.bannedAt && (
                    <div className="text-sm text-red-500 mt-1">
                      封禁时间：{new Date(showDetailModal.bannedAt).toLocaleString('zh-CN')}
                    </div>
                  )}
                  {showDetailModal.bannedUntil ? (
                    <div className="text-sm text-red-500 mt-1">
                      解封时间：{new Date(showDetailModal.bannedUntil).toLocaleString('zh-CN')}
                    </div>
                  ) : (
                    <div className="text-sm text-red-500 mt-1">封禁类型：永久封禁</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                关闭
              </button>
              {showDetailModal.status === 'banned' ? (
                <button
                  onClick={() => { setShowDetailModal(null); handleUnban(showDetailModal.id) }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  解封用户
                </button>
              ) : (
                <button
                  onClick={() => { setShowDetailModal(null); setShowBanModal(showDetailModal.id) }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  封禁用户
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
