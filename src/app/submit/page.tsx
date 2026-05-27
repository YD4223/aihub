'use client'

import { useState, useRef, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Zap, CheckCircle, Upload, X, Loader2, AlertCircle, Terminal, Cpu, Rocket } from 'lucide-react'

interface Category {
  id: number
  name: string
  slug: string
}

export default function SubmitToolPage() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    websiteUrl: '',
    shortDesc: '',
    description: '',
    categoryId: '',
    pricingType: '',
    githubUrl: '',
    logoUrl: '',
    tags: ''
  })
  // 标签列表状态（用于 UI 展示）
  const [tagList, setTagList] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // 加载分类
  useEffect(() => {
    fetch('/api/categories')
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log('分类数据:', data)
        if (data.categories) {
          setCategories(data.categories)
        } else {
          console.error('分类数据格式错误:', data)
        }
      })
      .catch(err => {
        console.error('加载分类失败:', err)
      })
      .finally(() => setLoadingCategories(false))
  }, [])

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB')
        return
      }
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

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    
    // 检查登录
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      setSubmitError('请先登录后再提交工具')
      return
    }
    const user = JSON.parse(userStr)

    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: tagList.length > 0 ? tagList.join(',') : null,
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
          userId: user.id
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        setSubmitError(data.error || `提交失败 (${res.status})`)
      } else {
        setSubmitSuccess(true)
      }
    } catch (err: any) {
      setSubmitError('网络错误: ' + (err.message || '请稍后重试'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 添加标签
  const addTag = () => {
    const trimmed = tagInput.trim().replace(/^#+/, '')
    if (!trimmed || tagList.length >= 5 || tagList.includes(trimmed)) return
    setTagList(prev => [...prev, trimmed])
    setTagInput('')
  }

  // 删除标签
  const removeTag = (idx: number) => {
    setTagList(prev => prev.filter((_, i) => i !== idx))
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-cyber-background">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div 
            className="bg-cyber-card border border-neon-green p-12 relative"
            style={{
              clipPath: 'polygon(0 16px, 16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px))'
            }}
          >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-green" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-green" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-green" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-green" />
            
            <div 
              className="w-20 h-20 bg-neon-green/10 border border-neon-green flex items-center justify-center mx-auto mb-6"
              style={{
                clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              <CheckCircle className="w-10 h-10 text-neon-green" />
            </div>
            <h2 className="text-2xl font-orbitron font-bold text-cyber-foreground mb-4">提交成功！</h2>
            <p className="text-cyber-muted-foreground mb-8 font-mono">
              {'>'} 感谢你的分享，我们会在1-3个工作日内完成审核。<br/>
              {'>'} 审核通过后，你的工具将展示在平台上。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-neon-green text-cyber-background font-mono font-semibold hover:shadow-neon transition-all duration-200"
              style={{
                clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              继续提交
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />

      {/* Header - Cyberpunk Style */}
      <div className="relative border-b border-cyber-border overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-magenta/15 via-transparent to-neon-cyan/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,0,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,255,0.02) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        {/* Scanline effect overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.1) 2px, rgba(255,0,255,0.1) 4px)'
        }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta font-mono text-sm mb-6"
            style={{
              clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))'
            }}
          >
            <Zap className="w-4 h-4" />
            <span>免费提交 // 快速审核</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-orbitron font-black text-cyber-foreground mb-4 tracking-wide">
            提交你的<span className="text-neon-magenta">AI工具</span>
          </h1>
          <p className="text-cyber-muted-foreground text-lg font-mono">
            {'>'} 让全球用户发现你的产品，扩大影响力
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { icon: Terminal, title: '填写信息', desc: '提供工具基本信息和链接', color: 'neon-cyan' },
            { icon: Cpu, title: '人工审核', desc: '我们在1-3个工作日内完成审核', color: 'neon-magenta' },
            { icon: Rocket, title: '正式上线', desc: '审核通过后展示给全球用户', color: 'neon-green' },
          ].map((step, i) => (
            <div 
              key={i} 
              className="group bg-cyber-card border border-cyber-border p-6 text-center hover:border-neon-magenta/50 transition-all duration-300"
              style={{
                clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))'
              }}
            >
              <div className={`w-12 h-12 mx-auto mb-3 flex items-center justify-center border border-${step.color}/30 bg-${step.color}/10`}
                style={{
                  clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))'
                }}
              >
                <step.icon className={`w-6 h-6 text-${step.color}`} style={{ color: step.color === 'neon-cyan' ? '#00d4ff' : step.color === 'neon-magenta' ? '#ff00ff' : '#00ff88' }} />
              </div>
              <div className="font-orbitron font-semibold text-cyber-foreground mb-1">{step.title}</div>
              <div className="text-sm text-cyber-muted-foreground font-mono">{step.desc}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div 
          className="bg-cyber-card border border-cyber-border p-8 relative"
          style={{
            clipPath: 'polygon(0 16px, 16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px))'
          }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-neon-magenta/50" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-neon-magenta/50" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-neon-magenta/50" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-neon-magenta/50" />

          <h2 className="text-xl font-orbitron font-bold text-cyber-foreground mb-6 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-neon-magenta" />
            填写工具信息
          </h2>
          
          {submitError && (
            <div 
              className="flex items-center gap-2 bg-neon-red/10 border border-neon-red text-neon-red px-4 py-3 mb-6 font-mono"
              style={{
                clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                  工具名称 <span className="text-neon-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：ChatGPT"
                  className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-magenta focus:outline-none transition-colors"
                  style={{
                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                  官网链接 <span className="text-neon-red">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.websiteUrl}
                  onChange={e => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-magenta focus:outline-none transition-colors"
                  style={{
                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                一句话介绍 <span className="text-neon-red">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.shortDesc}
                onChange={e => setFormData(prev => ({ ...prev, shortDesc: e.target.value }))}
                placeholder="用一句话描述你的工具（不超过100字）"
                className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-magenta focus:outline-none transition-colors"
                style={{
                  clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                详细描述
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="详细介绍工具的功能、使用场景和特点..."
                className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-magenta focus:outline-none transition-colors resize-none"
                style={{
                  clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                }}
              />
            </div>

            {/* 图片上传区域 */}
            <div>
              <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                工具截图 <span className="text-cyber-muted-foreground font-normal">（可选，最多5张）</span>
              </label>
              
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
                  {uploadedImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="relative aspect-square overflow-hidden border border-cyber-border group"
                      style={{
                        clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))'
                      }}
                    >
                      <img src={img} alt={`预览 ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-neon-red text-cyber-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                          clipPath: 'polygon(0 3px, 3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px))'
                        }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {uploadedImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-cyber-border text-cyber-muted-foreground hover:border-neon-magenta hover:text-neon-magenta transition-colors font-mono"
                  style={{
                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
                >
                  <Upload className="w-5 h-5" />
                  <span>点击上传图片</span>
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <p className="text-xs text-cyber-muted-foreground mt-2 font-mono">
                {'>'} 支持 JPG、PNG 格式，单张图片不超过 5MB
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                  工具分类 <span className="text-neon-red">*</span>
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono focus:border-neon-magenta focus:outline-none transition-colors appearance-none"
                  style={{
                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
                >
                  <option value="" className="bg-cyber-card">{loadingCategories ? '加载中...' : '请选择分类'}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-cyber-card">{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                  定价类型 <span className="text-neon-red">*</span>
                </label>
                <select
                  required
                  value={formData.pricingType}
                  onChange={e => setFormData(prev => ({ ...prev, pricingType: e.target.value }))}
                  className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono focus:border-neon-magenta focus:outline-none transition-colors appearance-none"
                  style={{
                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
                >
                  <option value="" className="bg-cyber-card">请选择</option>
                  <option value="FREE" className="bg-cyber-card">免费</option>
                  <option value="FREEMIUM" className="bg-cyber-card">免费+付费</option>
                  <option value="PAID" className="bg-cyber-card">付费</option>
                  <option value="OPEN_SOURCE" className="bg-cyber-card">开源免费</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                GitHub 链接（开源项目填写）
              </label>
              <input
                type="url"
                value={formData.githubUrl}
                onChange={e => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                placeholder="https://github.com/..."
                className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-magenta focus:outline-none transition-colors"
                style={{
                  clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                话题标签 <span className="text-cyber-muted-foreground/60">（选填，最多5个，按 Enter 添加）</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap border border-cyber-border bg-cyber-input px-3 py-2"
                style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                <span className="text-neon-cyan text-xs font-mono">#</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                  onBlur={addTag}
                  placeholder="输入标签后自动添加"
                  className="flex-1 bg-transparent border-none outline-none text-cyber-foreground text-xs font-mono placeholder:text-cyber-muted-foreground"
                />
              </div>
              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tagList.map((tag, i) => (
                    <span key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                    >
                      # {tag}
                      <button onClick={() => removeTag(i)} className="text-cyber-muted-foreground hover:text-neon-magenta transition-colors ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-mono text-cyber-muted-foreground mb-2">
                Logo 链接（可选）
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={e => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://... (JPG/PNG)"
                className="w-full px-4 py-3 bg-cyber-input border border-cyber-border text-cyber-foreground font-mono placeholder:text-cyber-muted-foreground focus:border-neon-magenta focus:outline-none transition-colors"
                style={{
                  clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                }}
              />
            </div>

            {/* 提交须知 */}
            <div 
              className="bg-cyber-muted/50 border border-cyber-border p-4 space-y-2"
              style={{
                clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              <p className="text-sm font-mono text-cyber-foreground mb-3">{'>'} 提交须知：</p>
              {[
                '工具必须与AI相关',
                '不接受违法、诈骗类工具',
                '审核通过后将在首页展示',
                '提交即同意我们在平台上展示该工具',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-cyber-muted-foreground font-mono">
                  <CheckCircle className="w-4 h-4 text-neon-green flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-neon-magenta text-cyber-background py-4 font-orbitron font-bold text-lg hover:shadow-[0_0_20px_rgba(255,0,255,0.5)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))'
              }}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isSubmitting ? '提交中...' : '提交审核'}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}
