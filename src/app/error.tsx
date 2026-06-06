'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center px-6">
        <h2 className="text-2xl font-bold text-cyber-foreground mb-4 font-orbitron">出错了</h2>
        <p className="text-cyber-muted-foreground font-mono text-sm mb-6">
          {error.message?.includes('chunk') ? '资源加载超时，请刷新页面重试' : '页面加载失败'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan font-mono text-sm clip-chamfer-sm hover:bg-neon-cyan/30 transition-all duration-200"
        >
          刷新页面
        </button>
      </div>
    </div>
  )
}
