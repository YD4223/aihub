'use client'

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  CheckCircle, XCircle, Clock, Eye, 
  MessageSquare, Wrench, Trash2, Share2,
  Loader2, AlertCircle, Search, Filter,
  ChevronLeft, ChevronRight, RefreshCw,
  ExternalLink, User, Users, Ban, RotateCcw,
  Flag, Shield, Unlock, Info, Mail
} from 'lucide-react'
import { getAvatarInitial } from '@/lib/utils'

interface Tool {
  id: number
  name: string
  slug: string
  description: string | null
  shortDesc: string | null
  websiteUrl: string
  githubUrl: string | null
  logoUrl: string | null
  pricingType: string
  isOpenSource: boolean
  tags: string | null
  features: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  reviewNote: string | null
  reviewedAt: string | null
  suspendedAt: string | null
  suspendedReason: string | null
  createdAt: string
  source: string | null
  submittedBy: number | null
  categoryName: string | null
  category: { name: string } | null
}

interface Comment {
  id: string
  content: string
  userId: number
  userName: string | null
  userAvatarUrl: string | null
  toolName: string | null
  sourceType: 'tool' | 'share'
  status: string
  suspendedAt: string | null
  suspendedReason: string | null
  createdAt: string
}

type TabType = 'tools' | 'comments' | 'shares' | 'reports' | 'users' | 'verifyLogs'
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended'
type SourceFilter = 'all' | 'crawler' | 'user'

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tools')
  // 权限检查：非管理员直接显示空白
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      setAuthChecked(true)
      return
    }
    try {
      const user = JSON.parse(userStr)
      if (user.role === 'ADMIN') {
        setIsAdmin(true)
      }
    } catch {
      // ignore
    } finally {
      setAuthChecked(true)
    }
  }, [])
  
  // 工具审核状态
  const [tools, setTools] = useState<Tool[]>([])
  const [toolsLoading, setToolsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [toolSearch, setToolSearch] = useState('')
  const [toolPage, setToolPage] = useState(1)
  const [toolTotal, setToolTotal] = useState(0)
  const [toolTotalPages, setToolTotalPages] = useState(1)
  const [toolStats, setToolStats] = useState({ pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 })
  const [processingTool, setProcessingTool] = useState<number | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [showReviewModal, setShowReviewModal] = useState<number | null>(null)
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set())

  // 评论管理状态
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentSearch, setCommentSearch] = useState('')
  const [commentPage, setCommentPage] = useState(1)
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentTotalPages, setCommentTotalPages] = useState(1)
  const [deletingComment, setDeletingComment] = useState<string | null>(null)
  const [processingComment, setProcessingComment] = useState<string | null>(null)
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null)
  const [commentReviewNote, setCommentReviewNote] = useState('')

  // 分享管理状态
  const [shares, setShares] = useState<any[]>([])
  const [sharesLoading, setSharesLoading] = useState(true)
  const [shareStatusFilter, setShareStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('pending')
  const [shareTypeFilter, setShareTypeFilter] = useState<'all' | 'tool' | 'life'>('all')
  const [shareSearch, setShareSearch] = useState('')
  const [sharePage, setSharePage] = useState(1)
  const [shareTotal, setShareTotal] = useState(0)
  const [shareTotalPages, setShareTotalPages] = useState(1)
  const [shareStats, setShareStats] = useState({ pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0, tool: 0, life: 0 })
  const [processingShare, setProcessingShare] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState<number | null>(null)
  const [shareReviewNote, setShareReviewNote] = useState('')
  const [expandedShares, setExpandedShares] = useState<Set<number>>(new Set())

  // 举报管理状态
  const [reports, setReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending')
  const [reportPage, setReportPage] = useState(1)
  const [reportTotal, setReportTotal] = useState(0)
  const [reportTotalPages, setReportTotalPages] = useState(1)
  const [reportStats, setReportStats] = useState({ pending: 0, resolved: 0, dismissed: 0, total: 0 })
  const [processingReport, setProcessingReport] = useState<number | null>(null)
  const [showReportModal, setShowReportModal] = useState<number | null>(null)
  const [reportResolution, setReportResolution] = useState('')
  const [suspendReportTarget, setSuspendReportTarget] = useState(false)

  // 验证码日志状态
  interface VerificationLog {
    id: number
    email: string
    ipAddress: string | null
    userAgent: string | null
    sentAt: string
    success: boolean
    reason: string | null
  }
  const [verifyLogs, setVerifyLogs] = useState<VerificationLog[]>([])
  const [verifyLogsLoading, setVerifyLogsLoading] = useState(true)
  const [verifyLogPage, setVerifyLogPage] = useState(1)
  const [verifyLogTotalPages, setVerifyLogTotalPages] = useState(1)
  const [verifyLogTotal, setVerifyLogTotal] = useState(0)
  const [verifyLogSearchEmail, setVerifyLogSearchEmail] = useState('')
  const [verifyLogSearchIp, setVerifyLogSearchIp] = useState('')
  const [verifyLogSuccessFilter, setVerifyLogSuccessFilter] = useState<'all' | 'true' | 'false'>('all')
  const [verifyStats, setVerifyStats] = useState({ totalRequests: 0, successCount: 0, failCount: 0, uniqueEmails: 0, uniqueIps: 0 })

  // 加载工具
  const loadTools = async (p = toolPage) => {
    setToolsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      params.append('page', p.toString())
      params.append('limit', '10')
      if (toolSearch) params.append('search', toolSearch)

      const res = await fetch(`/api/admin/tools?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTools(data.tools)
        setToolTotal(data.total)
        setToolTotalPages(data.totalPages)
        setToolStats(data.stats)
      }
    } catch (err) {
      console.error('加载工具失败:', err)
    } finally {
      setToolsLoading(false)
    }
  }

  // 加载评论
  const loadComments = async (p = commentPage) => {
    setCommentsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', p.toString())
      params.append('limit', '20')
      if (commentSearch) params.append('search', commentSearch)

      const res = await fetch(`/api/admin/comments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments)
        setCommentTotal(data.total)
        setCommentTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('加载评论失败:', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'tools') {
      loadTools(1)
      setToolPage(1)
    }
  }, [statusFilter, sourceFilter, toolSearch, activeTab])

  useEffect(() => {
    if (activeTab === 'tools') loadTools(toolPage)
  }, [toolPage, activeTab])

  useEffect(() => {
    if (activeTab === 'comments') {
      loadComments(1)
      setCommentPage(1)
    }
  }, [commentSearch, activeTab])

  useEffect(() => {
    if (activeTab === 'comments') loadComments(commentPage)
  }, [commentPage, activeTab])

  // 审核工具
  const handleReviewTool = async (toolId: number, action: 'approve' | 'reject' | 'suspend' | 'restore') => {
    setProcessingTool(toolId)
    try {
      const res = await fetch(`/api/admin/tools/${toolId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: reviewNote })
      })
      if (res.ok) {
        setShowReviewModal(null)
        setReviewNote('')
        loadTools(toolPage)
      }
    } catch (err) {
      console.error('审核失败:', err)
    } finally {
      setProcessingTool(null)
    }
  }

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return
    setDeletingComment(commentId)
    try {
      const res = await fetch(`/api/admin/comments?id=${commentId}`, { method: 'DELETE' })
      if (res.ok) {
        loadComments(commentPage)
      }
    } catch (err) {
      console.error('删除失败:', err)
    } finally {
      setDeletingComment(null)
    }
  }

  // 下架/恢复评论
  const handleReviewComment = async (commentId: string, action: 'suspend' | 'restore') => {
    setProcessingComment(commentId)
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: commentReviewNote })
      })
      if (res.ok) {
        setShowCommentModal(null)
        setCommentReviewNote('')
        loadComments(commentPage)
      }
    } catch (err) {
      console.error('操作失败:', err)
    } finally {
      setProcessingComment(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-medium"><Clock className="w-3 h-3" />待审核</span>
      case 'approved':
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" />已通过</span>
      case 'rejected':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" />已拒绝</span>
      case 'suspended':
        return <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full text-xs font-medium"><Ban className="w-3 h-3" />已下架</span>
      default:
        return null
    }
  }

  // 加载分享
  const loadShares = async (p = sharePage) => {
    setSharesLoading(true)
    try {
      const params = new URLSearchParams()
      if (shareStatusFilter !== 'all') params.append('status', shareStatusFilter)
      if (shareTypeFilter !== 'all') params.append('type', shareTypeFilter)
      params.append('page', p.toString())
      params.append('limit', '10')
      if (shareSearch) params.append('search', shareSearch)
      // 添加时间戳防止缓存
      params.append('_t', Date.now().toString())
      
      const res = await fetch(`/api/admin/shares?${params}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setShares(data.shares || [])
        setShareTotalPages(data.totalPages || 1)
        setShareTotal(data.total || 0)
        setShareStats(data.stats || { pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0, tool: 0, life: 0 })
      }
    } catch (error) {
      console.error('获取分享列表失败:', error)
    } finally {
      setSharesLoading(false)
    }
  }

  // 审核分享/下架/恢复
  const handleReviewShare = async (id: number, action: 'approve' | 'reject' | 'suspend' | 'restore') => {
    setProcessingShare(id)
    try {
      const res = await fetch(`/api/admin/shares/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: shareReviewNote })
      })
      if (res.ok) {
        setShowShareModal(null)
        setShareReviewNote('')
        loadShares()
      }
    } catch (error) {
      console.error('审核失败:', error)
    } finally {
      setProcessingShare(null)
    }
  }

  // 删除分享
  const handleDeleteShare = async (id: number) => {
    if (!confirm('确定要删除这条分享吗？此操作不可恢复！')) return
    try {
      const res = await fetch(`/api/admin/shares/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadShares()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '删除失败，请重试')
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请检查网络连接')
    }
  }

  // 加载举报
  const loadReports = async (p = reportPage) => {
    setReportsLoading(true)
    try {
      const params = new URLSearchParams()
      if (reportStatusFilter !== 'all') params.append('status', reportStatusFilter)
      params.append('page', p.toString())
      params.append('limit', '20')
      
      const res = await fetch(`/api/reports?${params}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setReports(data.reports || [])
        setReportTotalPages(data.totalPages || 1)
        setReportTotal(data.total || 0)
        // 计算统计数据
        const pending = data.reports?.filter((r: any) => r.status === 'pending').length || 0
        const resolved = data.reports?.filter((r: any) => r.status === 'resolved').length || 0
        const dismissed = data.reports?.filter((r: any) => r.status === 'dismissed').length || 0
        setReportStats({ 
          pending, 
          resolved, 
          dismissed, 
          total: data.total || 0 
        })
      }
    } catch (error) {
      console.error('获取举报列表失败:', error)
    } finally {
      setReportsLoading(false)
    }
  }

  // 处理举报
  const handleProcessReport = async (id: number, action: 'resolved' | 'dismissed', suspendTarget: boolean = false) => {
    setProcessingReport(id)
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolution: reportResolution, suspendTarget })
      })
      if (res.ok) {
        setShowReportModal(null)
        setReportResolution('')
        setSuspendReportTarget(false)
        loadReports()
      }
    } catch (error) {
      console.error('处理举报失败:', error)
    } finally {
      setProcessingReport(null)
    }
  }

  // 当切换到 shares tab 时加载数据
  useEffect(() => {
    if (activeTab === 'shares') {
      loadShares(1)
    }
  }, [activeTab, shareStatusFilter, shareTypeFilter])

  // 当切换到 reports tab 时加载数据
  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports(1)
    }
  }, [activeTab, reportStatusFilter])

  // 加载验证码日志
  const loadVerifyLogs = async (p = verifyLogPage) => {
    setVerifyLogsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', p.toString())
      params.append('limit', '20')
      if (verifyLogSearchEmail) params.append('email', verifyLogSearchEmail)
      if (verifyLogSearchIp) params.append('ip', verifyLogSearchIp)
      if (verifyLogSuccessFilter !== 'all') params.append('success', verifyLogSuccessFilter)

      const res = await fetch(`/api/admin/verify-logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setVerifyLogs(data.logs)
        setVerifyLogTotal(data.pagination.total)
        setVerifyLogTotalPages(data.pagination.totalPages)
        setVerifyStats(data.stats)
      }
    } catch (err) {
      console.error('加载验证码日志失败:', err)
    } finally {
      setVerifyLogsLoading(false)
    }
  }

  // 当切换到 verifyLogs tab 时加载数据
  useEffect(() => {
    if (activeTab === 'verifyLogs') {
      loadVerifyLogs(1)
    }
  }, [activeTab, verifyLogSuccessFilter])

  return !authChecked ? (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-gray-500">验证身份中...</p>
      </div>
    </div>
  ) : !isAdmin ? notFound() : (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">后台管理</h1>
              <p className="text-sm text-gray-500 mt-1">审核工具和管理评论</p>
            </div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab 切换 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'tools' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Wrench className="w-5 h-5" />
            工具审核
            {toolStats.pending > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {toolStats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'comments' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            评论管理
          </button>
          <button
            onClick={() => setActiveTab('shares')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'shares' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Share2 className="w-5 h-5" />
            分享管理
            {shareStats.pending > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {shareStats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'reports' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Flag className="w-5 h-5" />
            举报管理
            {reportStats.pending > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {reportStats.pending}
              </span>
            )}
          </button>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50"
          >
            <Users className="w-5 h-5" />
            用户管理
          </Link>
          <button
            onClick={() => setActiveTab('verifyLogs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'verifyLogs' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Mail className="w-5 h-5" />
            验证码日志
          </button>
        </div>

        {/* 工具审核 Tab */}
        {activeTab === 'tools' && (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: '待审核', value: toolStats.pending, color: 'amber', icon: Clock },
                { label: '已通过', value: toolStats.approved, color: 'green', icon: CheckCircle },
                { label: '已拒绝', value: toolStats.rejected, color: 'red', icon: XCircle },
                { label: '已下架', value: toolStats.suspended, color: 'purple', icon: Ban },
                { label: '全部', value: toolStats.total, color: 'gray', icon: Eye },
              ].map(stat => (
                <button
                  key={stat.label}
                  onClick={() => setStatusFilter(stat.label === '全部' ? 'all' : stat.label === '待审核' ? 'pending' : stat.label === '已通过' ? 'approved' : stat.label === '已拒绝' ? 'rejected' : 'suspended')}
                  className={`text-left bg-white rounded-xl p-4 border-2 transition-all ${
                    (statusFilter === 'all' && stat.label === '全部') ||
                    (statusFilter === 'pending' && stat.label === '待审核') ||
                    (statusFilter === 'approved' && stat.label === '已通过') ||
                    (statusFilter === 'rejected' && stat.label === '已拒绝') ||
                    (statusFilter === 'suspended' && stat.label === '已下架')
                      ? `border-${stat.color}-500 ring-1 ring-${stat.color}-500`
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <stat.icon className="w-4 h-4" />
                    <span className="text-xs">{stat.label}</span>
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
                  value={toolSearch}
                  onChange={e => { setToolSearch(e.target.value); setToolPage(1) }}
                  placeholder="搜索工具名称或描述..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              {/* 来源筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">来源:</span>
                <select
                  value={sourceFilter}
                  onChange={e => { setSourceFilter(e.target.value as SourceFilter); setToolPage(1) }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">全部</option>
                  <option value="crawler">我的工具</option>
                  <option value="user">用户提交</option>
                </select>
              </div>
              <button
                onClick={() => loadTools(toolPage)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                title="刷新"
              >
                <RefreshCw className={`w-4 h-4 ${toolsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 工具列表 */}
            {toolsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : tools.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无数据</h3>
                <p className="text-gray-500">{statusFilter === 'pending' ? '没有待审核的工具' : '没有找到符合条件的工具'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tools.map(tool => (
                  <div key={tool.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* 卡片主体 */}
                    <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* 头部 */}
                        <div className="flex items-center gap-3 flex-wrap mb-3">
                          {tool.logoUrl && (
                            <img src={tool.logoUrl} alt="" className="w-8 h-8 rounded object-contain border border-gray-100" />
                          )}
                          <h3 className="font-bold text-gray-900 text-base">{tool.name}</h3>
                          {(tool.categoryName || tool.category?.name) && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-sm text-gray-500">{tool.categoryName || tool.category?.name}</span>
                            </>
                          )}
                          <span className="text-gray-300">|</span>
                          <span className="text-xs text-gray-400">{timeAgo(tool.createdAt)}</span>
                          <span className="text-gray-300">|</span>
                          {getStatusBadge(tool.status)}
                          <span className="text-gray-300">|</span>
                          {tool.source === 'user' ? (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">用户提交</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">我的工具</span>
                          )}
                          {/* 定价类型 */}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            tool.pricingType === 'FREE' ? 'bg-green-100 text-green-700' :
                            tool.pricingType === 'FREEMIUM' ? 'bg-blue-100 text-blue-700' :
                            tool.pricingType === 'PAID' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {tool.pricingType === 'FREE' ? '免费' : tool.pricingType === 'FREEMIUM' ? '免费+付费' : tool.pricingType === 'PAID' ? '付费' : tool.pricingType === 'OPEN_SOURCE' ? '开源免费' : tool.pricingType}
                          </span>
                        </div>

                        {/* 简短描述 */}
                        <p className="text-gray-700 text-sm mb-2">{tool.shortDesc || tool.description}</p>

                        {/* 链接 */}
                        <div className="flex items-center gap-4 text-sm">
                          <a href={tool.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-600 hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" />
                            官网
                          </a>
                          {tool.githubUrl && (
                            <a href={tool.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                              <ExternalLink className="w-3.5 h-3.5" />
                              GitHub
                            </a>
                          )}
                          {/* 展开/收起按钮 */}
                          <button
                            onClick={() => setExpandedTools(prev => {
                              const next = new Set(prev)
                              next.has(tool.id) ? next.delete(tool.id) : next.add(tool.id)
                              return next
                            })}
                            className="flex items-center gap-1 text-gray-400 hover:text-primary-600 transition-colors text-xs ml-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {expandedTools.has(tool.id) ? '收起详情' : '展开详情'}
                          </button>
                        </div>

                        {/* 审核备注 */}
                        {tool.reviewNote && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                            <span className="font-medium">拒绝原因：</span>{tool.reviewNote}
                          </div>
                        )}

                        {/* 下架原因 */}
                        {tool.suspendedReason && (
                          <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                            <span className="font-medium">下架原因：</span>{tool.suspendedReason}
                            {tool.suspendedAt && (
                              <span className="text-purple-500 ml-2">
                                ({new Date(tool.suspendedAt).toLocaleDateString('zh-CN')} 下架)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-col gap-2">
                        {tool.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleReviewTool(tool.id, 'approve')}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {processingTool === tool.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              通过
                            </button>
                            <button
                              onClick={() => setShowReviewModal(tool.id)}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              拒绝
                            </button>
                          </>
                        ) : tool.status === 'suspended' ? (
                          <>
                            <button
                              onClick={() => handleReviewTool(tool.id, 'restore')}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {processingTool === tool.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                              恢复上架
                            </button>
                            <button
                              onClick={() => setShowReviewModal(tool.id)}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                              修改原因
                            </button>
                          </>
                        ) : tool.status === 'rejected' ? (
                          <>
                            <button
                              onClick={() => handleReviewTool(tool.id, 'approve')}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                            >
                              {processingTool === tool.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              改为通过
                            </button>
                            <button
                              onClick={() => setShowReviewModal(tool.id)}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                              下架
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReviewTool(tool.id, 'reject')}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                            >
                              {processingTool === tool.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              改为拒绝
                            </button>
                            <button
                              onClick={() => setShowReviewModal(tool.id)}
                              disabled={processingTool === tool.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                              下架
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    </div>

                    {/* 展开的详细信息 */}
                    {expandedTools.has(tool.id) && (
                      <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          完整提交信息
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 官网 */}
                          <div>
                            <div className="text-xs text-gray-400 mb-1">官网链接</div>
                            <a href={tool.websiteUrl} target="_blank" rel="noopener noreferrer" 
                               className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              {tool.websiteUrl}
                            </a>
                          </div>

                          {/* GitHub */}
                          {tool.githubUrl && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">GitHub 链接</div>
                              <a href={tool.githubUrl} target="_blank" rel="noopener noreferrer"
                                 className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                {tool.githubUrl}
                              </a>
                            </div>
                          )}

                          {/* Logo */}
                          {tool.logoUrl && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Logo 链接</div>
                              <div className="flex items-center gap-2">
                                <img src={tool.logoUrl} alt="" className="w-10 h-10 object-contain rounded border bg-white p-1" />
                                <span className="text-xs text-gray-500 break-all">{tool.logoUrl}</span>
                              </div>
                            </div>
                          )}

                          {/* 定价类型 */}
                          <div>
                            <div className="text-xs text-gray-400 mb-1">定价类型</div>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              tool.pricingType === 'FREE' ? 'bg-green-100 text-green-700' :
                              tool.pricingType === 'FREEMIUM' ? 'bg-blue-100 text-blue-700' :
                              tool.pricingType === 'PAID' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {tool.pricingType === 'FREE' ? '免费' :
                               tool.pricingType === 'FREEMIUM' ? '免费+付费' :
                               tool.pricingType === 'PAID' ? '付费' :
                               tool.pricingType === 'OPEN_SOURCE' ? '开源免费' : tool.pricingType}
                            </span>
                          </div>
                        </div>

                        {/* 详细描述 */}
                        {tool.description && tool.description !== tool.shortDesc && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">详细描述</div>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200 whitespace-pre-wrap">
                              {tool.description}
                            </p>
                          </div>
                        )}

                        {/* 一句话介绍 */}
                        {tool.shortDesc && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">一句话介绍</div>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{tool.shortDesc}</p>
                          </div>
                        )}

                        {/* Tags/截图 */}
                        {tool.tags && (() => {
                          try {
                            const imgs = JSON.parse(tool.tags)
                            if (Array.isArray(imgs) && imgs.length > 0) {
                              return (
                                <div>
                                  <div className="text-xs text-gray-400 mb-2">工具截图（{imgs.length} 张）</div>
                                  <div className="flex flex-wrap gap-2">
                                    {imgs.map((img: string, idx: number) => (
                                      <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                                        <img src={img} alt={`截图 ${idx + 1}`} className="w-32 h-20 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                          } catch {}
                          return null
                        })()}

                        {/* 分类信息 */}
                        <div className="flex items-center gap-6 text-xs text-gray-400 pt-2 border-t border-gray-200">
                          <span>分类：{tool.categoryName || tool.category?.name || '未分类'}</span>
                          <span>来源：{tool.source === 'user' ? '用户提交' : '站长添加'}</span>
                          <span>ID：{tool.id}</span>
                          <span>提交时间：{new Date(tool.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* 分页 */}
                {toolTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-gray-500">共 {toolTotal} 条，第 {toolPage}/{toolTotalPages} 页</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setToolPage(p => Math.max(1, p - 1))} disabled={toolPage === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                      {Array.from({ length: Math.min(5, toolTotalPages) }, (_, i) => {
                        let pageNum = toolTotalPages <= 5 ? i + 1 : toolPage <= 3 ? i + 1 : toolPage >= toolTotalPages - 2 ? toolTotalPages - 4 + i : toolPage - 2 + i
                        return (
                          <button key={pageNum} onClick={() => setToolPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium ${toolPage === pageNum ? 'bg-primary-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                            {pageNum}
                          </button>
                        )
                      })}
                      <button onClick={() => setToolPage(p => Math.min(toolTotalPages, p + 1))} disabled={toolPage === toolTotalPages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 评论管理 Tab */}
        {activeTab === 'comments' && (
          <>
            {/* 搜索 */}
            <div className="bg-white rounded-xl p-4 mb-6 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={commentSearch}
                  onChange={e => { setCommentSearch(e.target.value); setCommentPage(1) }}
                  placeholder="搜索评论内容..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <button
                onClick={() => loadComments(commentPage)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                title="刷新"
              >
                <RefreshCw className={`w-4 h-4 ${commentsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 评论列表 */}
            {commentsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : comments.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无评论</h3>
                <p className="text-gray-500">没有找到符合条件的评论</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ background: stringToColor(comment.userName || '匿名') }}
                          >
                            {getAvatarInitial(comment.userName || '匿')}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{comment.userName || '匿名用户'}</span>
                          <span className="text-gray-300">|</span>
                          {comment.sourceType === 'share' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                              用户分享
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                              AI工具
                            </span>
                          )}
                          {comment.toolName && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-sm text-primary-600">{comment.toolName}</span>
                            </>
                          )}
                          <span className="text-gray-300">|</span>
                          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
                          <span className="text-gray-300">|</span>
                          {comment.status === 'suspended' ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1">
                              <Ban className="w-3 h-3" />已下架
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />正常
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm">{comment.content}</p>
                        
                        {/* 下架原因 */}
                        {comment.suspendedReason && (
                          <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                            <span className="font-medium">下架原因：</span>{comment.suspendedReason}
                            {comment.suspendedAt && (
                              <span className="text-purple-500 ml-2">
                                ({new Date(comment.suspendedAt).toLocaleDateString('zh-CN')} 下架)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {comment.status === 'suspended' ? (
                          <button
                            onClick={() => handleReviewComment(comment.id, 'restore')}
                            disabled={processingComment === comment.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="恢复显示"
                          >
                            {processingComment === comment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowCommentModal(comment.id)}
                            disabled={processingComment === comment.id}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="下架评论"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingComment === comment.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除评论"
                        >
                          {deletingComment === comment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 分页 */}
                {commentTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-gray-500">共 {commentTotal} 条，第 {commentPage}/{commentTotalPages} 页</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCommentPage(p => Math.max(1, p - 1))} disabled={commentPage === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                      {Array.from({ length: Math.min(5, commentTotalPages) }, (_, i) => {
                        let pageNum = commentTotalPages <= 5 ? i + 1 : commentPage <= 3 ? i + 1 : commentPage >= commentTotalPages - 2 ? commentTotalPages - 4 + i : commentPage - 2 + i
                        return (
                          <button key={pageNum} onClick={() => setCommentPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium ${commentPage === pageNum ? 'bg-primary-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                            {pageNum}
                          </button>
                        )
                      })}
                      <button onClick={() => setCommentPage(p => Math.min(commentTotalPages, p + 1))} disabled={commentPage === commentTotalPages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 分享管理 Tab */}
        {activeTab === 'shares' && (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
              {[
                { label: '待审核', value: shareStats.pending, color: 'amber', icon: Clock },
                { label: '已通过', value: shareStats.approved, color: 'green', icon: CheckCircle },
                { label: '已拒绝', value: shareStats.rejected, color: 'red', icon: XCircle },
                { label: '已下架', value: shareStats.suspended, color: 'purple', icon: Ban },
                { label: '工具圈', value: shareStats.tool || 0, color: 'orange', icon: Wrench },
                { label: '生活圈', value: shareStats.life || 0, color: 'green', icon: Share2 },
                { label: '总计', value: shareStats.total, color: 'gray', icon: Share2 }
              ].map((stat) => (
                <button
                  key={stat.label}
                  onClick={() => { 
                    if (stat.label === '工具圈') { setShareTypeFilter('tool'); setShareStatusFilter('all'); setSharePage(1) }
                    else if (stat.label === '生活圈') { setShareTypeFilter('life'); setShareStatusFilter('all'); setSharePage(1) }
                    else { setShareStatusFilter(stat.label === '全部' ? 'all' : stat.label === '待审核' ? 'pending' : stat.label === '已通过' ? 'approved' : stat.label === '已拒绝' ? 'rejected' : stat.label === '已下架' ? 'suspended' : 'all'); setShareTypeFilter('all'); setSharePage(1) }
                  }}
                  className={`text-left bg-white rounded-xl p-4 border-2 transition-all ${
                    (shareStatusFilter === 'all' && stat.label === '全部') ||
                    (shareStatusFilter === 'pending' && stat.label === '待审核') ||
                    (shareStatusFilter === 'approved' && stat.label === '已通过') ||
                    (shareStatusFilter === 'rejected' && stat.label === '已拒绝') ||
                    (shareStatusFilter === 'suspended' && stat.label === '已下架') ||
                    (shareTypeFilter === 'tool' && stat.label === '工具圈') ||
                    (shareTypeFilter === 'life' && stat.label === '生活圈')
                      ? `border-${stat.color}-500 ring-1 ring-${stat.color}-500`
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 text-${stat.color}-200`} />
                  </div>
                </button>
              ))}
            </div>

            {/* 筛选和搜索 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* 状态筛选 */}
                <div className="flex items-center gap-2">
                  {(['all', 'pending', 'approved', 'rejected', 'suspended'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setShareStatusFilter(s); setSharePage(1) }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        shareStatusFilter === s
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'all' ? '全部' : s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '已下架'}
                    </button>
                  ))}
                </div>
                {/* 类型筛选 */}
                <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                  <span className="text-sm text-gray-500">类型:</span>
                  {(['all', 'tool', 'life'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setShareTypeFilter(t); setSharePage(1) }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        shareTypeFilter === t
                          ? t === 'tool' ? 'bg-orange-100 text-orange-700' : t === 'life' ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'all' ? '全部' : t === 'tool' ? '工具圈' : '生活圈'}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索分享内容、用户或工具..."
                      value={shareSearch}
                      onChange={(e) => setShareSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadShares()}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => loadShares()}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 分享列表 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {sharesLoading ? (
                <div className="p-8 text-center text-gray-500">加载中...</div>
              ) : shares.length === 0 ? (
                <div className="p-8 text-center text-gray-500">暂无分享</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {shares.map((share) => (
                    <div key={share.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shrink-0"
                          style={{ background: stringToColor(share.user?.username || '匿') }}
                        >
                          {(share.user?.username || '匿')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{share.user?.username || '匿名用户'}</span>
                            <span className="text-sm text-gray-500">{timeAgo(share.createdAt)}</span>
                            {/* 类型标签 */}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              share.type === 'tool' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {share.type === 'tool' ? '工具圈' : '生活圈'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              share.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              share.status === 'approved' ? 'bg-green-100 text-green-700' :
                              share.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {share.status === 'pending' ? '待审核' : share.status === 'approved' ? '已通过' : share.status === 'rejected' ? '已拒绝' : '已下架'}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{share.content}</p>
                          
                          {/* 下架原因 */}
                          {share.suspendedReason && (
                            <div className="mb-3 p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                              <span className="font-medium">下架原因：</span>{share.suspendedReason}
                              {share.suspendedAt && (
                                <span className="text-purple-500 ml-2">
                                  ({new Date(share.suspendedAt).toLocaleDateString('zh-CN')} 下架)
                                </span>
                              )}
                            </div>
                          )}
                          
                          {(() => {
                            let imageList: string[] = [];
                            if (share.images) {
                              if (Array.isArray(share.images)) {
                                imageList = share.images;
                              } else if (typeof share.images === 'string') {
                                try {
                                  const parsed = JSON.parse(share.images);
                                  imageList = Array.isArray(parsed) ? parsed : [share.images];
                                } catch {
                                  imageList = [share.images];
                                }
                              }
                            }
                            return imageList.length > 0 ? (
                              <div className="flex gap-2 mb-3">
                                {imageList.map((img: string, idx: number) => (
                                  <img key={idx} src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                                ))}
                              </div>
                            ) : null;
                          })()}
                          
                          {/* 视频显示 */}
                          {share.video && (
                            <div className="mb-3">
                              <div className="relative w-40 h-52 bg-black rounded-xl overflow-hidden">
                                <video 
                                  src={share.video} 
                                  className="w-full h-full object-cover"
                                  controls
                                  preload="metadata"
                                />
                              </div>
                              <span className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                视频内容
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {/* 工具圈显示关联工具，生活圈不显示 */}
                            {share.type === 'tool' && share.tool && (
                              <>
                                <span>工具: <Link href={`/tools/${share.tool?.slug}`} className="text-primary-600 hover:underline">{share.tool?.name}</Link></span>
                                <span>|</span>
                              </>
                            )}
                            <span>{share._count?.comments || 0} 条评论</span>
                            <span>|</span>
                            <span>{share.likes} 点赞</span>
                            {/* 工具圈显示展开详情按钮 */}
                            {share.type === 'tool' && (
                              <>
                                <span>|</span>
                                <button
                                  onClick={() => setExpandedShares(prev => {
                                    const next = new Set(prev)
                                    next.has(share.id) ? next.delete(share.id) : next.add(share.id)
                                    return next
                                  })}
                                  className="flex items-center gap-1 text-primary-600 hover:underline"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {expandedShares.has(share.id) ? '收起详情' : '展开详情'}
                                </button>
                              </>
                            )}
                          </div>

                          {/* 展开的详细信息 - 仅工具圈 */}
                          {share.type === 'tool' && expandedShares.has(share.id) && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                用户提交的完整信息
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 工具名称 */}
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">工具名称</div>
                                  <div className="text-sm text-gray-900 font-medium">{share.submitToolName || '未填写'}</div>
                                </div>

                                {/* 官网链接 */}
                                {share.submitToolWebsite && (
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">官网链接</div>
                                    <a href={share.submitToolWebsite} target="_blank" rel="noopener noreferrer" 
                                       className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      {share.submitToolWebsite}
                                    </a>
                                  </div>
                                )}

                                {/* GitHub */}
                                {share.submitToolGithub && (
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">GitHub 链接</div>
                                    <a href={share.submitToolGithub} target="_blank" rel="noopener noreferrer"
                                       className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      {share.submitToolGithub}
                                    </a>
                                  </div>
                                )}

                                {/* Logo */}
                                {share.submitToolLogo && (
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">Logo</div>
                                    <div className="flex items-center gap-2">
                                      <img src={share.submitToolLogo} alt="" className="w-10 h-10 object-contain rounded border bg-white p-1" />
                                      <span className="text-xs text-gray-500 break-all">{share.submitToolLogo}</span>
                                    </div>
                                  </div>
                                )}

                                {/* 分类 */}
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">分类</div>
                                  <div className="text-sm text-gray-700">{share.submitToolCategory || '未分类'}</div>
                                </div>

                                {/* 定价类型 */}
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">定价类型</div>
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    share.submitToolPricing === 'FREE' ? 'bg-green-100 text-green-700' :
                                    share.submitToolPricing === 'FREEMIUM' ? 'bg-blue-100 text-blue-700' :
                                    share.submitToolPricing === 'PAID' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {share.submitToolPricing === 'FREE' ? '免费' :
                                     share.submitToolPricing === 'FREEMIUM' ? '免费+付费' :
                                     share.submitToolPricing === 'PAID' ? '付费' :
                                     share.submitToolPricing === 'OPEN_SOURCE' ? '开源免费' : share.submitToolPricing || '未填写'}
                                  </span>
                                </div>
                              </div>

                              {/* 详细描述 */}
                              {share.submitToolDesc && (
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">详细描述</div>
                                  <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200 whitespace-pre-wrap">
                                    {share.submitToolDesc}
                                  </p>
                                </div>
                              )}

                              {/* 关联工具信息 */}
                              {share.tool && (
                                <div className="pt-3 border-t border-gray-200">
                                  <div className="text-xs text-gray-400 mb-2">已关联工具</div>
                                  <div className="flex items-center gap-2">
                                    <Link href={`/tools/${share.tool.slug}`} className="text-sm text-primary-600 hover:underline font-medium">
                                      {share.tool.name}
                                    </Link>
                                    <span className="text-xs text-gray-400">(ID: {share.tool.id})</span>
                                  </div>
                                </div>
                              )}

                              {/* 元信息 */}
                              <div className="flex items-center gap-6 text-xs text-gray-400 pt-2 border-t border-gray-200">
                                <span>分享 ID：{share.id}</span>
                                <span>用户 ID：{share.userId}</span>
                                <span>发布时间：{new Date(share.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {share.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReviewShare(share.id, 'approve')}
                                disabled={processingShare === share.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="通过"
                              >
                                {processingShare === share.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => handleReviewShare(share.id, 'reject')}
                                disabled={processingShare === share.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="拒绝"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {share.status === 'approved' && (
                            <>
                              <button
                                onClick={() => handleReviewShare(share.id, 'reject')}
                                disabled={processingShare === share.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="改为拒绝"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setShowShareModal(share.id)}
                                disabled={processingShare === share.id}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="下架"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {share.status === 'rejected' && (
                            <>
                              <button
                                onClick={() => handleReviewShare(share.id, 'approve')}
                                disabled={processingShare === share.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="改为通过"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setShowShareModal(share.id)}
                                disabled={processingShare === share.id}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="下架"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {share.status === 'suspended' && (
                            <>
                              <button
                                onClick={() => handleReviewShare(share.id, 'restore')}
                                disabled={processingShare === share.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="恢复上架"
                              >
                                {processingShare === share.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => setShowShareModal(share.id)}
                                disabled={processingShare === share.id}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="修改下架原因"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteShare(share.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 分页 */}
            {shareTotalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setSharePage(p => Math.max(1, p - 1))}
                  disabled={sharePage === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600">第 {sharePage} 页 / 共 {shareTotalPages} 页</span>
                <button
                  onClick={() => setSharePage(p => Math.min(shareTotalPages, p + 1))}
                  disabled={sharePage === shareTotalPages}
                  className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}

        {/* 举报管理 Tab */}
        {activeTab === 'reports' && (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '待处理', value: reportStats.pending, color: 'amber', icon: Clock },
                { label: '已处理', value: reportStats.resolved, color: 'green', icon: CheckCircle },
                { label: '已驳回', value: reportStats.dismissed, color: 'gray', icon: XCircle },
                { label: '全部', value: reportStats.total, color: 'blue', icon: Eye },
              ].map(stat => (
                <button
                  key={stat.label}
                  onClick={() => {
                    setReportStatusFilter(stat.label === '待处理' ? 'pending' : stat.label === '已处理' ? 'resolved' : stat.label === '已驳回' ? 'dismissed' : 'all')
                    setReportPage(1)
                  }}
                  className={`bg-white p-4 rounded-xl border-2 transition-all text-left ${
                    (stat.label === '待处理' && reportStatusFilter === 'pending') ||
                    (stat.label === '已处理' && reportStatusFilter === 'resolved') ||
                    (stat.label === '已驳回' && reportStatusFilter === 'dismissed') ||
                    (stat.label === '全部' && reportStatusFilter === 'all')
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                    <span className="text-gray-500 text-sm">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </button>
              ))}
            </div>

            {/* 举报列表 */}
            <div className="bg-white rounded-xl shadow-sm">
              {reportsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无举报记录</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reports.map((report: any) => (
                    <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* 头部信息 */}
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已处理' : '已驳回'}
                            </span>
                            <span className="text-xs text-gray-400">{timeAgo(report.createdAt)}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {report.type === 'tool' ? '工具' : 
                               report.type === 'share' ? '分享' : 
                               report.type === 'comment' ? '评论' : '分享评论'}
                            </span>
                          </div>

                          {/* 举报原因 */}
                          <div className="mb-3">
                            <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                              {report.reason}
                            </span>
                          </div>

                          {/* 被举报内容 */}
                          {report.targetInfo && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                              <div className="text-xs text-gray-500 mb-1">被举报内容：</div>
                              <div className="text-sm text-gray-800 line-clamp-2">
                                {report.type === 'tool' ? report.targetInfo.name :
                                 report.targetInfo.content || report.targetInfo.toolName || '未知内容'}
                              </div>
                              {report.targetInfo.authorName && (
                                <div className="text-xs text-gray-500 mt-1">
                                  作者：{report.targetInfo.authorName}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 详细描述 */}
                          {report.description && (
                            <div className="text-sm text-gray-600 mb-3">
                              <span className="text-gray-400">详细描述：</span>{report.description}
                            </div>
                          )}

                          {/* 举报人 */}
                          <div className="text-xs text-gray-400">
                            举报人：{report.reporterName || '匿名用户'} · ID: {report.id}
                          </div>

                          {/* 处理结果 */}
                          {report.status !== 'pending' && report.resolution && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                              <div className="text-blue-700">
                                <span className="font-medium">处理结果：</span>{report.resolution}
                              </div>
                              {report.resolvedAt && (
                                <div className="text-blue-500 text-xs mt-1">
                                  {timeAgo(report.resolvedAt)} 处理
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        {report.status === 'pending' && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => setShowReportModal(report.id)}
                              disabled={processingReport === report.id}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              处理
                            </button>
                            <button
                              onClick={() => handleProcessReport(report.id, 'dismissed')}
                              disabled={processingReport === report.id}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
                            >
                              驳回
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 分页 */}
            {reportTotalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setReportPage(p => Math.max(1, p - 1))}
                  disabled={reportPage === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600">第 {reportPage} 页 / 共 {reportTotalPages} 页</span>
                <button
                  onClick={() => setReportPage(p => Math.min(reportTotalPages, p + 1))}
                  disabled={reportPage === reportTotalPages}
                  className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}

        {/* 验证码日志 Tab */}
        {activeTab === 'verifyLogs' && (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">24h 总请求</div>
                <div className="text-2xl font-bold text-gray-900">{verifyStats.totalRequests}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">24h 发送成功</div>
                <div className="text-2xl font-bold text-green-600">{verifyStats.successCount}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">24h 被拦截</div>
                <div className="text-2xl font-bold text-red-500">{verifyStats.failCount}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">24h 独立邮箱</div>
                <div className="text-2xl font-bold text-blue-600">{verifyStats.uniqueEmails}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">24h 独立IP</div>
                <div className="text-2xl font-bold text-purple-600">{verifyStats.uniqueIps}</div>
              </div>
            </div>

            {/* 筛选栏 */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="搜索邮箱..."
                value={verifyLogSearchEmail}
                onChange={e => setVerifyLogSearchEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadVerifyLogs(1)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
              />
              <input
                type="text"
                placeholder="搜索IP..."
                value={verifyLogSearchIp}
                onChange={e => setVerifyLogSearchIp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadVerifyLogs(1)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
              />
              <select
                value={verifyLogSuccessFilter}
                onChange={e => setVerifyLogSuccessFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部状态</option>
                <option value="true">发送成功</option>
                <option value="false">被拦截</option>
              </select>
              <button
                onClick={() => loadVerifyLogs(1)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                搜索
              </button>
              <button
                onClick={async () => {
                  if (!confirm('确定清空所有验证码日志？此操作不可恢复！')) return
                  await fetch('/api/admin/verify-logs', { method: 'DELETE' })
                  loadVerifyLogs(1)
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 ml-auto"
              >
                清空所有日志
              </button>
            </div>

            {/* 日志列表 */}
            {verifyLogsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : verifyLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">暂无验证码日志</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">邮箱</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">IP 地址</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">原因</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">User-Agent</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">时间</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifyLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-400">{log.id}</td>
                        <td className="py-3 px-4 font-mono text-gray-800">{log.email}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{log.ipAddress || '-'}</td>
                        <td className="py-3 px-4">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" /> 成功
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3" /> 拦截
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate" title={log.reason || ''}>
                          {log.reason || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-[200px] truncate text-xs" title={log.userAgent || ''}>
                          {log.userAgent ? log.userAgent.substring(0, 50) + '...' : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={async () => {
                              if (!confirm('确定删除这条日志？')) return
                              await fetch('/api/admin/verify-logs?id=' + log.id, { method: 'DELETE' })
                              loadVerifyLogs()
                            }}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页 */}
            {verifyLogTotalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <span className="text-sm text-gray-500">共 {verifyLogTotal} 条记录</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setVerifyLogPage(p => Math.max(1, p - 1)); loadVerifyLogs(verifyLogPage - 1) }}
                    disabled={verifyLogPage === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-gray-600">第 {verifyLogPage} 页 / 共 {verifyLogTotalPages} 页</span>
                  <button
                    onClick={() => { setVerifyLogPage(p => Math.min(verifyLogTotalPages, p + 1)); loadVerifyLogs(verifyLogPage + 1) }}
                    disabled={verifyLogPage === verifyLogTotalPages}
                    className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {tools.find(t => t.id === showReviewModal)?.status === 'suspended' ? '修改下架原因' : '下架工具'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {tools.find(t => t.id === showReviewModal)?.status === 'suspended' 
                ? '请填写新的下架原因：' 
                : '请填写下架原因（必填）：'}
            </p>
            <textarea
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder="例如：涉嫌侵权、内容违规、用户投诉..."
              className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowReviewModal(null); setReviewNote('') }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleReviewTool(showReviewModal, 'suspend')}
                disabled={processingTool === showReviewModal || !reviewNote.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {processingTool === showReviewModal ? <Loader2 className="w-4 h-4 animate-spin" /> : '确认下架'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 评论下架弹窗 */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {comments.find(c => c.id === showCommentModal)?.status === 'suspended' ? '修改下架原因' : '下架评论'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {comments.find(c => c.id === showCommentModal)?.status === 'suspended' 
                ? '请填写新的下架原因：' 
                : '请填写下架原因（必填）：'}
            </p>
            <textarea
              value={commentReviewNote}
              onChange={e => setCommentReviewNote(e.target.value)}
              placeholder="例如：涉嫌侵权、内容违规、恶意攻击..."
              className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowCommentModal(null); setCommentReviewNote('') }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleReviewComment(showCommentModal, 'suspend')}
                disabled={processingComment === showCommentModal || !commentReviewNote.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {processingComment === showCommentModal ? <Loader2 className="w-4 h-4 animate-spin" /> : '确认下架'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享下架弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {shares.find(s => s.id === showShareModal)?.status === 'suspended' ? '修改下架原因' : '下架分享'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {shares.find(s => s.id === showShareModal)?.status === 'suspended' 
                ? '请填写新的下架原因：' 
                : '请填写下架原因（必填）：'}
            </p>
            <textarea
              value={shareReviewNote}
              onChange={e => setShareReviewNote(e.target.value)}
              placeholder="例如：涉嫌侵权、内容违规、用户投诉..."
              className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowShareModal(null); setShareReviewNote('') }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleReviewShare(showShareModal, 'suspend')}
                disabled={processingShare === showShareModal || !shareReviewNote.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {processingShare === showShareModal ? <Loader2 className="w-4 h-4 animate-spin" /> : '确认下架'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 举报处理弹窗 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">处理举报</h3>
            
            {/* 被举报内容信息 */}
            {(() => {
              const report = reports.find(r => r.id === showReportModal)
              if (!report) return null
              return (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">被举报内容：</div>
                  <div className="text-sm text-gray-800">
                    {report.type === 'tool' ? report.targetInfo?.name :
                     report.type === 'share' ? '分享内容' :
                     report.type === 'comment' ? '评论内容' : '分享评论'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    类型：{report.type === 'tool' ? '工具' : 
                           report.type === 'share' ? '分享' : 
                           report.type === 'comment' ? '评论' : '分享评论'}
                  </div>
                </div>
              )
            })()}

            <p className="text-gray-500 text-sm mb-4">
              请填写处理结果说明（可选）：
            </p>
            <textarea
              value={reportResolution}
              onChange={e => setReportResolution(e.target.value)}
              placeholder="例如：已下架处理、内容无违规、已联系用户..."
              className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            
            {/* 同时下架选项 */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="suspendTarget"
                checked={suspendReportTarget}
                onChange={(e) => setSuspendReportTarget(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="suspendTarget" className="text-sm text-gray-700 cursor-pointer">
                同时下架该内容
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowReportModal(null); setReportResolution(''); setSuspendReportTarget(false) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleProcessReport(showReportModal, 'resolved', suspendReportTarget)}
                disabled={processingReport === showReportModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {processingReport === showReportModal ? <Loader2 className="w-4 h-4 animate-spin" /> : suspendReportTarget ? '确认并下架' : '确认处理'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
