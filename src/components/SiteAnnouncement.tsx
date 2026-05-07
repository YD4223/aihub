'use client'

import { useEffect, useState } from 'react'
import { Megaphone, ChevronRight, Terminal } from 'lucide-react'

interface AnnouncementItem {
  id: number
  text: string
  type: string
}

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
  info:    { label: '资讯', color: 'text-neon-cyan border-neon-cyan/50 bg-neon-cyan/10' },
  update:  { label: '更新', color: 'text-neon-green border-neon-green/50 bg-neon-green/10' },
  event:   { label: '活动', color: 'text-neon-magenta border-neon-magenta/50 bg-neon-magenta/10' },
  notice:  { label: '公告', color: 'text-amber-400 border-amber-400/50 bg-amber-400/10' },
}

export default function SiteAnnouncement() {
  const [list, setList] = useState<AnnouncementItem[]>([])
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(data => {
        if (data.announcements?.length > 0) setList(data.announcements)
      })
      .catch(() => {})
  }, [])

  // 自动轮播
  useEffect(() => {
    if (paused || list.length <= 1) return
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % list.length)
        setVisible(true)
      }, 300)
    }, 4000)
    return () => clearInterval(timer)
  }, [paused, list.length])

  if (list.length === 0) return null

  const item = list[current]
  const style = TYPE_STYLES[item.type] || TYPE_STYLES.info

  return (
    <div
      className="relative bg-cyber-card border border-neon-green/20 clip-chamfer overflow-hidden group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,136,0.03)_50%)] bg-[length:100%_4px] pointer-events-none" />
      <div className="absolute -left-20 top-0 w-40 h-full bg-gradient-to-r from-neon-green/5 to-transparent" />

      <div className="relative flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center clip-chamfer-sm bg-neon-green/10 border border-neon-green/30">
            <Megaphone className="w-4 h-4 text-neon-green" />
          </div>
        </div>

        <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider border clip-chamfer-sm ${style.color}`}>
          {style.label}
        </span>

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className={`transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-neon-green/50 flex-shrink-0" />
              <span className="text-sm text-cyber-foreground font-mono truncate">{item.text}</span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => { setVisible(false); setTimeout(() => { setCurrent(i); setVisible(true) }, 300) }}
              title={`切换到第 ${i+1} 条公告`}
              className={`transition-all duration-300 cursor-pointer ${
                i === current
                  ? 'w-6 h-6 bg-neon-green text-cyber-background text-[10px] font-bold rounded flex items-center justify-center'
                  : 'w-1.5 h-1.5 rounded-full bg-cyber-muted-foreground/30 hover:bg-neon-green/60 hover:scale-125'
              }`}
            >
              {i === current ? i + 1 : ''}
            </button>
          ))}
        </div>

        <ChevronRight className="w-4 h-4 text-neon-green/50 group-hover:text-neon-green group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </div>
  )
}
