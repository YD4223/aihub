'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface LiveStatsProps {
  toolId: number
  initialLikeCount: number
  initialViewCount: number
}

export default function LiveStats({ toolId, initialLikeCount, initialViewCount }: LiveStatsProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [viewCount, setViewCount] = useState(initialViewCount)

  const refreshStats = () => {
    fetch(`/api/tools/stats?toolId=${toolId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLikeCount(data.likeCount ?? likeCount)
          setViewCount(data.viewCount ?? viewCount)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    // 页面加载后实时获取最新数据
    refreshStats()
  }, [toolId])

  // 监听点赞事件，自动刷新
  useEffect(() => {
    window.addEventListener('localStorageChange', refreshStats)
    return () => window.removeEventListener('localStorageChange', refreshStats)
  }, [])

  return (
    <>
      <span className="flex items-center gap-1 whitespace-nowrap">
        <Heart className="w-4 h-4 text-neon-magenta flex-shrink-0" />
        {formatNumber(likeCount)} 点赞
      </span>
      <span className="whitespace-nowrap">{formatNumber(viewCount)} 次浏览</span>
    </>
  )
}
