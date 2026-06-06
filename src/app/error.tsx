'use client'

import { useEffect, useState } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [countdown, setCountdown] = useState(5)
  const isChunkError = error.message?.includes('chunk') || error.message?.includes('loading')

  useEffect(() => {
    console.error(error)
    // chunk 加载错误自动刷新
    if (isChunkError) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            window.location.reload()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [error, isChunkError])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
      {/* 背景故障效果 */}
      <div className="absolute inset-0 opacity-5"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.1) 2px, rgba(255,0,255,0.1) 4px)' }} />
      
      <div className="text-center relative z-10 px-6">
        {/* 故障标题 */}
        <div className="relative inline-block mb-6">
          <h1 className="text-6xl font-orbitron font-black text-neon-magenta animate-pulse"
            style={{ textShadow: '0 0 20px rgba(255,0,255,0.5), 0 0 40px rgba(255,0,255,0.3)' }}>
            ERROR
          </h1>
          <h1 className="absolute inset-0 text-6xl font-orbitron font-black text-neon-cyan opacity-50 translate-x-1" 
            style={{ clipPath: 'inset(20% 0 30% 0)' }}>
            ERROR
          </h1>
        </div>
        
        <p className="text-cyber-muted-foreground font-mono text-sm mb-2">
          {isChunkError ? '资源加载超时，正在自动重试...' : '页面加载失败'}
        </p>
        
        {isChunkError ? (
          <p className="text-neon-cyan font-mono text-xs mb-8">
            {countdown} 秒后自动刷新
          </p>
        ) : (
          <p className="text-cyber-muted-foreground/60 font-mono text-xs mb-8">
            {error.message || ''}
          </p>
        )}
        
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-neon-magenta/20 border border-neon-magenta/50 text-neon-magenta font-mono text-sm clip-chamfer-sm hover:bg-neon-magenta/30 hover:shadow-[0_0_15px_rgba(255,0,255,0.3)] transition-all duration-200"
          >
            立即刷新
          </button>
          <button
            onClick={reset}
            className="px-6 py-3 bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan font-mono text-sm clip-chamfer-sm hover:bg-neon-cyan/30 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-200"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  )
}
