'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp } from 'lucide-react'

interface LikeButtonProps {
  toolId: number
  toolData: {
    id: number
    slug: string
    name: string
    description: string | null
    iconUrl: string | null
    websiteUrl: string
    category: string
  }
}

export default function LikeButton({ toolId, toolData }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    const user = JSON.parse(userStr)
    fetch(`/api/user/likes?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.likes) {
          setIsLiked(data.likes.some((t: any) => t.id === toolId))
        }
      })
      .catch(() => {})
  }, [toolId])

  const handleLike = async () => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再点赞，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    const user = JSON.parse(userStr)
    setLoading(true)
    try {
      const res = await fetch('/api/user/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, toolId, toolData })
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setIsLiked(data.liked)
      window.dispatchEvent(new Event('localStorageChange'))
    } catch (e) {
      console.error('点赞失败:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3 font-orbitron font-medium transition-all ${
        isLiked
          ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan hover:bg-neon-cyan/30'
          : 'bg-cyber-muted/30 text-cyber-foreground border border-cyber-border hover:border-neon-cyan hover:text-neon-cyan'
      }`}
      style={{ borderRadius: '8px' }}
    >
      <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
      {isLiked ? '已点赞' : '点赞'}
    </button>
  )
}
