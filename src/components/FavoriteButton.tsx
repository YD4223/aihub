'use client'

import { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'

interface FavoriteButtonProps {
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

export default function FavoriteButton({ toolId, toolData }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    const user = JSON.parse(userStr)
    fetch(`/api/user/favorites?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.favorites) {
          setIsFavorited(data.favorites.some((t: any) => t.id === toolId))
        }
      })
      .catch(() => {})
  }, [toolId])

  const handleFavorite = async () => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      if (confirm('请先登录后再收藏，是否跳转到登录页面？')) {
        window.location.href = '/login'
      }
      return
    }
    const user = JSON.parse(userStr)
    setLoading(true)
    try {
      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, toolId, toolData })
      })
      const data = await res.json()
      setIsFavorited(data.favorited)
      window.dispatchEvent(new Event('localStorageChange'))
    } catch (e) {
      console.error('收藏失败:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFavorite}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3 font-orbitron font-medium transition-all ${
        isFavorited
          ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta hover:bg-neon-magenta/30'
          : 'bg-cyber-muted/30 text-cyber-foreground border border-cyber-border hover:border-neon-magenta hover:text-neon-magenta'
      }`}
      style={{ borderRadius: '8px' }}
    >
      <Bookmark className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
      {isFavorited ? '已收藏' : '收藏'}
    </button>
  )
}
