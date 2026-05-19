'use client'

import { useState, useEffect } from 'react'
import { Heart, Wrench, Sparkles, MessageCircle } from 'lucide-react'

interface Stats {
  toolCount: number
  lifeCount: number
  totalLikes: number
  totalComments: number
}

function NeonStatCard({ value, label, icon: Icon, color }: { value: string | number; label: string; icon: any; color: 'green' | 'cyan' | 'magenta' | 'yellow' }) {
  const colorMap: Record<string, { border: string; text: string; shadow: string; bg: string }> = {
    green: { border: 'border-neon-green', text: 'text-neon-green', shadow: 'shadow-neon', bg: 'bg-neon-green/10' },
    cyan: { border: 'border-neon-cyan', text: 'text-neon-cyan', shadow: 'shadow-neon-tertiary', bg: 'bg-neon-cyan/10' },
    magenta: { border: 'border-neon-magenta', text: 'text-neon-magenta', shadow: 'shadow-neon-secondary', bg: 'bg-neon-magenta/10' },
    yellow: { border: 'border-neon-yellow', text: 'text-neon-yellow', shadow: '', bg: 'bg-neon-yellow/10' },
  }
  const colors = colorMap[color]
  return (
    <div className={`relative ${colors.shadow} group`}>
      <div className={`p-4 border ${colors.border} ${colors.bg} clip-chamfer backdrop-blur-sm group-hover:-translate-y-1 transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center border ${colors.border} clip-chamfer-sm ${colors.bg}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <div className={`text-2xl font-orbitron font-black text-cyber-foreground`}>{value}</div>
            <div className="text-xs text-cyber-muted-foreground font-mono uppercase tracking-wider">{label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface LiveShareStatsProps {
  initialStats: Stats
}

export default function LiveShareStats({ initialStats }: LiveShareStatsProps) {
  const [stats, setStats] = useState(initialStats)

  const refresh = () => {
    fetch('/api/shares/stats')
      .then(r => r.json())
      .then(data => {
        if (data.totalLikes !== undefined) setStats(data)
      })
      .catch(() => {})
  }

  useEffect(() => {
    window.addEventListener('localStorageChange', refresh)
    return () => window.removeEventListener('localStorageChange', refresh)
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
      <NeonStatCard value={stats.toolCount} label="工具分享" icon={Wrench} color="green" />
      <NeonStatCard value={stats.lifeCount} label="生活动态" icon={Sparkles} color="cyan" />
      <NeonStatCard value={stats.totalLikes} label="总点赞" icon={Heart} color="magenta" />
      <NeonStatCard value={stats.totalComments} label="总评论" icon={MessageCircle} color="yellow" />
    </div>
  )
}
