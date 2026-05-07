'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Image as ImageIcon, Video, Send, Loader2, CheckCircle, Sparkles, Play, XCircle, Info } from 'lucide-react'

interface Tool {
  id: number
  name: string
  slug: string
  shortDesc: string
  logoUrl?: string
  categoryName?: string
}

interface CreateShareModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTool?: Tool | null
  onSuccess?: () => void
  mode?: 'tool' | 'life'  // tool = 工具圈, life = 生活圈
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6']
  return colors[Math.abs(hash) % colors.length]
}

const MAX_CONTENT_LENGTH = 200

// 图片限制配置
const IMAGE_CONFIG = {
  tool: { maxCount: 3, maxSize: 10 * 1024 * 1024 },  // 工具圈：最多3张，10MB/张
  life: { maxCount: 9, maxSize: 10 * 1024 * 1024 }   // 生活圈：最多9张，10MB/张
}

// 视频规格配置（参考微信朋友圈）
const VIDEO_CONFIG = {
  maxSize: 100 * 1024 * 1024, // 100MB
  maxDuration: 60, // 60秒
  allowedFormats: ['video/mp4', 'video/quicktime', 'video/x-m4v'], // MP4, MOV, M4V
  maxWidth: 1920,
  maxHeight: 1080,
  minWidth: 480,
  minHeight: 360
}

export default function CreateShareModal({ isOpen, onClose, defaultTool, onSuccess, mode = 'tool' }: CreateShareModalProps) {
  const [user, setUser] = useState<{ id: number; username: string } | null>(null)
  const [content, setContent] = useState('')
  const [selectedTool, setSelectedTool] = useState<Tool | null>(defaultTool || null)
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [mounted, setMounted] = useState(false)

  // 工具搜索
  const [toolSearch, setToolSearch] = useState('')
  const [toolResults, setToolResults] = useState<Tool[]>([])
  const [isSearchingTool, setIsSearchingTool] = useState(false)
  const [showToolDropdown, setShowToolDropdown] = useState(false)

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // 视频处理状态
  const [videoProcessing, setVideoProcessing] = useState(false)
  const [videoInfo, setVideoInfo] = useState<{
    duration: number
    width: number
    height: number
    size: number
    thumbnail: string | null
  } | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const toolSearchRef = useRef<HTMLDivElement>(null)

  // 获取登录用户 + 挂载状态
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  // 预填工具
  useEffect(() => {
    if (defaultTool) setSelectedTool(defaultTool)
  }, [defaultTool])

  // 重置状态 + 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      setContent('')
      setImages([])
      setVideo(null)
      setVideoFile(null)
      setError('')
      setSubmitSuccess(false)
      setToolSearch('')
      setToolResults([])
      setShowToolDropdown(false)
      if (!defaultTool) setSelectedTool(null)
      setTimeout(() => textareaRef.current?.focus(), 100)
      // 阻止背景滚动
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, defaultTool])

  // 搜索工具
  useEffect(() => {
    if (!toolSearch.trim()) {
      setToolResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingTool(true)
      try {
        const userStr = localStorage.getItem('user')
        const userId = userStr ? JSON.parse(userStr).id : 0
        if (!userId) { setToolResults([]); setIsSearchingTool(false); return }
        const res = await fetch(`/api/tools/search?q=${encodeURIComponent(toolSearch)}&limit=8&userId=${userId}`)
        const data = await res.json()
        setToolResults(data.tools || [])
      } catch {
        setToolResults([])
      } finally {
        setIsSearchingTool(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [toolSearch])

  // 点击外部关闭工具下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolSearchRef.current && !toolSearchRef.current.contains(e.target as Node)) {
        setShowToolDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 内容变化
  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    if (val.length <= MAX_CONTENT_LENGTH) {
      setContent(val)
    }
  }

  // 获取当前模式的图片配置
  const imageConfig = IMAGE_CONFIG[mode]

  // 图片上传（转 Base64 预览，实际项目可替换为上传 OSS）
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (video) {
      setError('已上传视频，不能同时上传图片')
      return
    }
    if (images.length + files.length > imageConfig.maxCount) {
      setError(`最多上传 ${imageConfig.maxCount} 张图片`)
      return
    }
    files.forEach(file => {
      if (file.size > imageConfig.maxSize) {
        setError('单张图片不超过 10MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImages(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  // 视频上传
  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (images.length > 0) {
      setVideoError('已上传图片，不能同时上传视频')
      e.target.value = ''
      return
    }
    
    setVideoError(null)
    setVideoInfo(null)
    
    // 检查文件格式
    if (!VIDEO_CONFIG.allowedFormats.includes(file.type)) {
      setVideoError('仅支持 MP4、MOV、M4V 格式的视频')
      e.target.value = ''
      return
    }
    
    // 检查文件大小
    if (file.size > VIDEO_CONFIG.maxSize) {
      setVideoError(`视频大小不能超过 ${VIDEO_CONFIG.maxSize / 1024 / 1024}MB`)
      e.target.value = ''
      return
    }
    
    setVideoProcessing(true)
    
    try {
      // 创建视频元素获取元数据
      const videoUrl = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('无法读取视频信息'))
        video.src = videoUrl
      })
      
      // 检查时长
      if (video.duration > VIDEO_CONFIG.maxDuration) {
        setVideoError(`视频时长不能超过 ${VIDEO_CONFIG.maxDuration} 秒`)
        URL.revokeObjectURL(videoUrl)
        setVideoProcessing(false)
        e.target.value = ''
        return
      }
      
      // 检查分辨率
      if (video.videoWidth < VIDEO_CONFIG.minWidth || video.videoHeight < VIDEO_CONFIG.minHeight) {
        setVideoError(`视频分辨率过低，最小支持 ${VIDEO_CONFIG.minWidth}x${VIDEO_CONFIG.minHeight}`)
        URL.revokeObjectURL(videoUrl)
        setVideoProcessing(false)
        e.target.value = ''
        return
      }
      
      // 截取封面（第1秒）
      video.currentTime = 1
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve()
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
      
      setVideoInfo({
        duration: Math.round(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
        size: file.size,
        thumbnail
      })
      
      // 读取视频文件
      const reader = new FileReader()
      reader.onload = (ev) => {
        setVideo(ev.target?.result as string)
        setVideoFile(file)
        setVideoProcessing(false)
      }
      reader.readAsDataURL(file)
      
      URL.revokeObjectURL(videoUrl)
    } catch (err) {
      setVideoError('视频处理失败，请重试')
      setVideoProcessing(false)
    }
    
    e.target.value = ''
  }

  function removeVideo() {
    setVideo(null)
    setVideoFile(null)
    setVideoInfo(null)
    setVideoError(null)
    setUploadProgress(0)
  }
  
  // 格式化文件大小
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }
  
  // 格式化时长
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 提交分享
  async function handleSubmit() {
    if (!user) {
      setError('请先登录后再发布分享')
      return
    }
    if (!content.trim()) {
      setError('请填写分享内容')
      return
    }
    // 工具圈必须选择工具，生活圈可选
    if (mode === 'tool' && !selectedTool) {
      setError('请选择关联的工具')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      // 如果有视频，使用 FormData 上传
      let body: string | FormData
      let headers: Record<string, string> = {}
      
      if (videoFile) {
        // 使用 FormData 上传视频
        const formData = new FormData()
        formData.append('type', mode)
        formData.append('content', content.trim())
        formData.append('userId', String(user.id))
        if (selectedTool?.id) {
          formData.append('toolId', String(selectedTool.id))
        }
        formData.append('video', videoFile)
        body = formData
      } else {
        // 使用 JSON 上传图片
        body = JSON.stringify({
          type: mode,
          content: content.trim(),
          toolId: selectedTool?.id,
          images: images.length > 0 ? images : null,
          userId: user.id
        })
        headers = { 'Content-Type': 'application/json' }
      }
      
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers,
        body
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '发布失败')

      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1800)
    } catch (err: any) {
      setError(err.message || '发布失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !mounted) return null

  const remaining = MAX_CONTENT_LENGTH - content.length

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      {/* 弹窗主体 - 简化测试 */}
      <div
        className="relative w-full max-w-lg rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#12121a',
          border: '2px solid #00d4ff',
          minHeight: '300px'
        }}
      >
        {/* Header - 简化 */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#2a2a3a' }}>
          <h2 className="text-cyber-foreground font-bold text-base">
            {mode === 'tool' ? '分享使用体验' : '发布动态'}
          </h2>
          <button onClick={onClose} className="text-cyber-foreground/50 hover:text-cyber-foreground text-xl transition-colors">×</button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {/* 用户信息 - 简化 */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: stringToColor(user.username) }}>
                {user.username[0].toUpperCase()}
              </div>
              <span className="text-sm text-cyber-foreground/80">{user.username}</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg text-xs bg-neon-cyan/5 text-neon-cyan border border-neon-cyan/20 font-mono">
              请先 <a href="/login" className="underline hover:text-neon-cyan/80">登录</a> 后发布
            </div>
          )}

          {/* 内容输入 - 简化 */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder={mode === 'life' ? '分享你的美好生活...' : '这个工具怎么样？说说你的体验...'}
              className="w-full h-24 resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neon-cyan/50 font-mono"
              style={{
                backgroundColor: '#0a0a0f',
                color: '#e0e0e0',
                border: '1px solid #2a2a3a'
              }}
            />
            <span className={`absolute bottom-2 right-3 text-xs font-mono ${content.length >= MAX_CONTENT_LENGTH - 20 ? 'text-neon-pink' : 'text-cyber-foreground/30'}`}>
              {content.length}/{MAX_CONTENT_LENGTH}
            </span>
          </div>

          {/* 关联工具 - 简化 */}
          {mode === 'tool' && (
            <div ref={toolSearchRef} className="mt-4">
              {selectedTool ? (
                <div className="flex items-center gap-2 p-2 bg-neon-cyan/5 rounded-lg border border-neon-cyan/20">
                  {selectedTool.logoUrl ? (
                    <img src={selectedTool.logoUrl} alt={selectedTool.name} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: stringToColor(selectedTool.name) }}>
                      {selectedTool.name[0]}
                    </div>
                  )}
                  <span className="text-sm text-cyber-foreground flex-1">{selectedTool.name}</span>
                  {!defaultTool && (
                    <button onClick={() => { setSelectedTool(null); setToolSearch('') }} className="text-xs text-cyber-foreground/40 hover:text-neon-pink px-1">更换</button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-foreground/30" />
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={e => { setToolSearch(e.target.value); setShowToolDropdown(true) }}
                    onFocus={() => setShowToolDropdown(true)}
                    placeholder="搜索要评价的工具..."
                    className="w-full pl-9 pr-4 py-2 bg-cyber-background rounded-lg border border-cyber-border text-sm text-cyber-foreground placeholder-cyber-foreground/30 focus:outline-none focus:border-neon-cyan/50 font-mono"
                  />
                  {isSearchingTool && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-foreground/30 animate-spin" />}

                  {showToolDropdown && toolResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto bg-cyber-card border border-cyber-border">
                      {toolResults.map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => { setSelectedTool(tool); setToolSearch(''); setShowToolDropdown(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neon-cyan/10 text-left transition-colors"
                        >
                          {tool.logoUrl ? (
                            <img src={tool.logoUrl} alt={tool.name} className="w-6 h-6 rounded object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: stringToColor(tool.name) }}>
                              {tool.name[0]}
                            </div>
                          )}
                          <span className="text-sm text-cyber-foreground">{tool.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 图片/视频上传 */}
          <div className="mt-4">
            {/* 提示文字 */}
            <p className="text-xs text-cyber-foreground/40 font-mono mb-2">
              最多可上传 {imageConfig.maxCount} 张图片
            </p>
            {/* 媒体预览区域 */}
            <div className="flex flex-wrap gap-2">
              {/* 已上传的图片 - 简化 */}
              {images.map((img, idx) => (
                <div key={idx} className={`relative group ${mode === 'life' ? 'w-20 h-20' : 'w-16 h-16'}`}>
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover rounded-lg border border-cyber-border"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-cyber-card border border-cyber-border text-cyber-foreground/50 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              
              {/* 视频预览 - 微信朋友圈风格 */}
              {video && (
                <div className="relative group">
                  {/* 视频卡片 */}
                  <div className="relative w-40 h-52 bg-black rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                    {/* 封面图 */}
                    {videoInfo?.thumbnail ? (
                      <img src={videoInfo.thumbnail} className="w-full h-full object-cover" alt="视频封面" />
                    ) : (
                      <video src={video} className="w-full h-full object-cover" />
                    )}
                    
                    {/* 渐变遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* 播放按钮 - 居中 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
                      </div>
                    </div>
                    
                    {/* 关闭按钮 - 右上角 */}
                    <button 
                      onClick={removeVideo} 
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    {/* 时长标签 - 右下角 */}
                    {videoInfo?.duration && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {formatDuration(videoInfo.duration)}
                      </div>
                    )}
                  </div>
                  
                  {/* 视频信息 - 卡片下方 */}
                  {videoInfo && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                        {formatFileSize(videoInfo.size)}
                      </span>
                      <span className="text-gray-400">
                        {videoInfo.width} × {videoInfo.height}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* 视频处理中 */}
              {videoProcessing && (
                <div className={`${mode === 'life' ? 'w-48 h-32' : 'w-40 h-28'} bg-cyber-background border border-cyber-border rounded-xl flex flex-col items-center justify-center gap-2`}>
                  <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
                  <span className="text-xs text-cyber-foreground/50 font-mono">处理中...</span>
                </div>
              )}
              
              {/* 添加按钮 - 简化 */}
              {!video && images.length < imageConfig.maxCount && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed border-cyber-border rounded-lg flex items-center justify-center text-cyber-foreground/30 hover:border-neon-cyan/50 hover:text-neon-cyan transition-colors ${mode === 'life' ? 'w-20 h-20' : 'w-16 h-16'}`}
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* 错误提示 - 统一显示 */}
            {(error || videoError) && (
              <div className="mt-3 flex items-center gap-2 p-2.5 bg-neon-pink/10 border border-neon-pink/30 rounded-lg text-xs text-neon-pink font-mono">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error || videoError}</span>
              </div>
            )}
            
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </div>
        </div>

        {/* 底部操作栏 - 简化 */}
        <div className="px-5 py-3 border-t border-cyber-border flex items-center justify-between flex-shrink-0">
          {/* 左侧 - 上传进度 */}
          <div className="flex-1 mr-4">
            {isSubmitting && videoFile && (
              <div className="flex items-center gap-2 text-xs text-cyber-foreground/50 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>上传中 {uploadProgress}%</span>
              </div>
            )}
          </div>

          {/* 右侧 - 按钮 */}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm text-cyber-foreground/50 hover:text-cyber-foreground transition-colors font-mono">取消</button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim() || (mode === 'tool' && !selectedTool) || !user || videoProcessing}
              className="px-5 py-1.5 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded text-sm font-medium hover:bg-neon-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
            >
              {isSubmitting ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
