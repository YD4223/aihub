'use client'

import { useState, useEffect } from 'react'
import { Plus, Wrench, Sparkles } from 'lucide-react'
import CreateShareModal from '@/components/CreateShareModalNew'

interface SharePageClientProps {
  mode: 'tool' | 'life'
}

export default function SharePageClient({ mode }: SharePageClientProps) {
  const [showModal, setShowModal] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  function handleToolSubmit() {
    if (!isClient) return
    
    const saved = localStorage.getItem('user')
    if (!saved) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search)
      return
    }
    
    // 工具圈：跳转到主页的提交工具页面
    window.location.href = '/submit'
  }

  function handleLifeShare() {
    if (!isClient) return
    
    // 生活圈：直接打开发布动态弹窗（弹窗内部会处理登录状态）
    setShowModal(true)
  }

  const isToolMode = mode === 'tool'

  return (
    <>
      <button
        onClick={isToolMode ? handleToolSubmit : handleLifeShare}
        className={`flex items-center gap-2 px-4 py-2.5 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all ${
          isToolMode
            ? 'bg-neon-green text-cyber-background hover:shadow-neon font-bold'
            : 'bg-neon-cyan text-cyber-background hover:shadow-neon-tertiary font-bold'
        }`}
      >
        <Plus className="w-4 h-4" />
        {isToolMode ? (
          <><Wrench className="w-4 h-4" />提交工具</>
        ) : (
          <><Sparkles className="w-4 h-4" />发布动态</>
        )}
      </button>

      {/* 只有生活圈才需要弹窗 */}
      {showModal && !isToolMode && (
        <CreateShareModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            // 发布成功后跳转到对应圈子页面（全页刷新，保证数据最新）
            window.location.href = `/user-share?tab=${mode}`
          }}
          mode={mode}
        />
      )}
    </>
  )
}
