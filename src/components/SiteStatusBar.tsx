'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, Zap } from 'lucide-react'

// 网站首次部署时间（2026年5月5日）
const DEPLOY_DATE = new Date('2026-05-05T00:00:00+08:00')

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

interface Duration {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calcDuration(): Duration {
  const diff = Date.now() - DEPLOY_DATE.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const totalSeconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export default function SiteStatusBar() {
  const [duration, setDuration] = useState<Duration>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDuration(calcDuration())

    // 每秒更新运行时间
    const durationTimer = setInterval(() => {
      setDuration(calcDuration())
    }, 1000)

    // 获取 sessionId（存 localStorage 保证同一浏览器不变）
    let sessionId = localStorage.getItem('ah_session_id')
    if (!sessionId) {
      sessionId = 'ah_' + crypto.randomUUID()
      localStorage.setItem('ah_session_id', sessionId)
    }

    // 心跳 ping + 获取在线人数（每 60 秒一次）
    const ping = async () => {
      try {
        const res = await fetch('/api/online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        if (res.ok) {
          const data = await res.json()
          setOnlineCount(data.count)
        }
      } catch {
        // 静默失败，不打扰用户
      }
    }

    // 立即执行一次
    ping()
    const pingTimer = setInterval(ping, 60000)

    return () => {
      clearInterval(durationTimer)
      clearInterval(pingTimer)
    }
  }, [])

  // SSR 期间不渲染，避免 hydration 不匹配
  if (!mounted) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-mono text-cyber-muted-foreground/70">
      {/* 网站运行时间 */}
      <span className="flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-neon-cyan" />
        <span>
          已运行{' '}
          <span className="text-neon-cyan font-bold">{duration.days}</span> 天{' '}
          <span className="text-neon-cyan font-bold">{pad(duration.hours)}</span>:{' '}
          <span className="text-neon-cyan font-bold">{pad(duration.minutes)}</span>:{' '}
          <span className="text-neon-cyan font-bold">{pad(duration.seconds)}</span>
        </span>
      </span>

      {/* 分隔符 */}
      <span className="hidden sm:inline text-cyber-border">//</span>

      {/* 在线人数 */}
      <span className="flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-neon-green" />
        <span>
          当前在线{' '}
          {onlineCount !== null ? (
            <span className="text-neon-green font-bold">{onlineCount}</span>
          ) : (
            <span className="text-cyber-muted-foreground">--</span>
          )}{' '}
          人
        </span>
      </span>

      <span className="hidden sm:inline text-cyber-border">//</span>

      {/* 运行状态 */}
      <span className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-neon-magenta" />
        <span className="text-neon-magenta/70">正常</span>
      </span>
    </div>
  )
}
