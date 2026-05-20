'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Image as ImageIcon, Send, Loader2, GripVertical } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  mode?: 'tool' | 'life'
  onSuccess?: () => void
}

export default function CreateShareModalNew({ isOpen, onClose, mode = 'life', onSuccess }: Props) {
  const MAX_CONTENT = 100
  const MAX_IMAGES = 9

  const [user, setUser] = useState<{ id: number; username: string; avatarUrl?: string } | null>(null)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (isOpen) {
      setContent('')
      setImages([])
      setError('')
      setSelectedTags([])
      setTagInput('')
    }
  }, [isOpen])

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`)
      return
    }
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
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

  const MAX_TAGS = 5

  function addTag() {
    const trimmed = tagInput.trim().replace(/^#+/, '')
    if (!trimmed) return
    if (selectedTags.length >= MAX_TAGS) {
      setError(`最多添加 ${MAX_TAGS} 个标签`)
      return
    }
    if (selectedTags.includes(trimmed)) return
    if (trimmed.length > 20) {
      setError('每个标签不超过 20 个字')
      return
    }
    setSelectedTags(prev => [...prev, trimmed])
    setTagInput('')
    setError('')
  }

  function removeTag(idx: number) {
    setSelectedTags(prev => prev.filter((_, i) => i !== idx))
  }

  // 拖拽排序相关状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleDragStart(idx: number) {
    setDraggedIndex(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === idx) return
    setDragOverIndex(idx)
  }

  function handleDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIdx) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    
    // 重新排序图片
    setImages(prev => {
      const newImages = [...prev]
      const draggedImage = newImages[draggedIndex]
      newImages.splice(draggedIndex, 1)
      newImages.splice(dropIdx, 0, draggedImage)
      return newImages
    })
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  async function handleSubmit() {
    if (!user) {
      setError('请先登录')
      return
    }
    if (!content.trim() && images.length === 0) {
      setError('请填写内容或上传图片')
      return
    }
    if (content.length > MAX_CONTENT) {
      setError(`文字不能超过 ${MAX_CONTENT} 字，当前 ${content.length} 字`)
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
          content: content.trim(),
          images: images.length > 0 ? images : null,
          userId: user.id,
          tags: selectedTags.length > 0 ? selectedTags.join(',') : null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '发布失败')

      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.message || '发布失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !mounted) return null

  // 获取用户头像颜色
  const userColor = stringToColor(user?.username || '用户')

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[10vh] bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#12121a] border border-[#2a2a3a] w-[90%] max-w-[500px] min-h-[400px] max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a3a] flex-shrink-0 bg-[#0a0a0f]">
          <h2 className="text-lg font-bold text-[#e0e0e0] font-orbitron uppercase tracking-wider">
            <span className="text-[#00ff88]">{'>'}</span> 发布动态
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[#6b7280] hover:text-[#00ff88] hover:bg-[#1c1c2e] transition-all"
            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* 用户信息 */}
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 flex items-center justify-center text-[#0a0a0f] font-bold text-sm flex-shrink-0 font-orbitron"
              style={{ 
                background: `linear-gradient(135deg, ${userColor} 0%, ${adjustColor(userColor, -30)} 100%)`,
                clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#e0e0e0] font-orbitron">{user.username}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border border-[#00ff88] text-[#00ff88]"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    发布动态
                  </span>
                </div>
              ) : (
                <span className="text-[#ff3366] text-sm font-mono">[错误] 请先登录</span>
              )}
            </div>
          </div>
          
          {/* 文本输入 */}
          <div className="relative">
            <textarea
              value={content}
              onChange={e => {
                if (e.target.value.length <= MAX_CONTENT) {
                  setContent(e.target.value)
                }
              }}
              placeholder="分享你的生活..."
              className={`w-full h-[120px] bg-[#0a0a0f] border text-[#e0e0e0] text-sm resize-none focus:outline-none transition-all p-4 font-mono ${
                content.length >= MAX_CONTENT
                  ? 'border-[#ff3366] focus:border-[#ff3366] focus:shadow-[0_0_10px_#ff336640]'
                  : content.length >= MAX_CONTENT * 0.8
                  ? 'border-[#f59e0b] focus:border-[#f59e0b] focus:shadow-[0_0_10px_#f59e0b40]'
                  : 'border-[#2a2a3a] focus:border-[#00ff88] focus:shadow-[0_0_10px_#00ff8840]'
              }`}
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            />
            {/* 字数计数 */}
            <div className={`absolute bottom-2 right-3 text-xs font-mono ${
              content.length >= MAX_CONTENT
                ? 'text-[#ff3366]'
                : content.length >= MAX_CONTENT * 0.8
                ? 'text-[#f59e0b]'
                : 'text-[#4b5563]'
            }`}>
              {content.length}/{MAX_CONTENT}
            </div>
          </div>

          {/* 话题标签输入 */}
          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap border border-[#2a2a3a] bg-[#0a0a0f] px-3 py-2"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            >
              <span className="text-[#00d4ff] text-xs font-mono">#</span>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="添加话题标签（按 Enter 添加）"
                className="flex-1 bg-transparent border-none outline-none text-[#e0e0e0] text-xs font-mono placeholder:text-[#4b5563]"
              />
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff]"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                  >
                    # {tag}
                    <button onClick={() => removeTag(i)} className="text-[#6b7280] hover:text-[#ff3366] transition-colors ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 规则提示 */}
          <div className="flex items-center gap-4 mt-2 px-1">
            <span className="text-[10px] font-mono text-[#4b5563]">
              {'>'} 文字上限 <span className="text-[#00d4ff]">{MAX_CONTENT}</span> 字
            </span>
            <span className="text-[10px] font-mono text-[#4b5563]">
              {'>'} 图片上限 <span className="text-[#00d4ff]">{MAX_IMAGES}</span> 张
            </span>
            {images.length > 1 && (
              <span className="text-[10px] font-mono text-[#00ff88]">
                {'>'} 拖拽图片可调整顺序
              </span>
            )}
          </div>

          {/* 图片预览 - 支持拖拽排序 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {images.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative w-20 h-20 group cursor-move transition-all duration-200 ${
                  draggedIndex === idx ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === idx && draggedIndex !== idx ? 'scale-105 ring-2 ring-[#00ff88]' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                title="拖拽可调整顺序"
              >
                {/* 序号标识 */}
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#00ff88] text-[#0a0a0f] text-[10px] font-bold flex items-center justify-center z-10"
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                  }}
                >
                  {idx + 1}
                </div>
                {/* 拖拽手柄 */}
                <div className="absolute top-0 right-0 p-1 bg-[#0a0a0f]/80 text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <GripVertical className="w-3 h-3" />
                </div>
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-cover border border-[#2a2a3a]"
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                  }}
                />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#ff3366] text-[#0a0a0f] text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-bold z-10"
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-[#2a2a3a] bg-[#0a0a0f] text-[#6b7280] flex items-center justify-center hover:border-[#00ff88] hover:text-[#00ff88] hover:bg-[#1c1c2e] transition-all"
                style={{
                  clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                }}
              >
                <ImageIcon className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 bg-[#ff3366]/10 border border-[#ff3366] text-[#ff3366] text-sm font-mono"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
              }}
            >
              [错误] {error}
            </div>
          )}
          
          {/* 发布按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full mt-5 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-wider font-orbitron ${
              isSubmitting 
                ? 'bg-[#1c1c2e] text-[#6b7280] cursor-not-allowed' 
                : 'bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00ff88]/90 hover:shadow-[0_0_20px_#00ff8860]'
            }`}
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                发布中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                发布
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </div>
    </div>,
    document.body
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
