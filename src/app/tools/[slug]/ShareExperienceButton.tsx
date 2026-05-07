'use client'

import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import CreateShareModal from '@/components/CreateShareModal'
import { useRouter } from 'next/navigation'

interface ShareExperienceButtonProps {
  tool: {
    id: number
    name: string
    slug: string
    shortDesc: string
    logoUrl?: string | null
    categoryName?: string
  }
}

export default function ShareExperienceButton({ tool }: ShareExperienceButtonProps) {
  const [user, setUser] = useState<{ id: number; username: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  function handleClick() {
    if (!user) {
      router.push('/login')
      return
    }
    setShowModal(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-6 py-3 bg-neon-orange/20 text-neon-orange border border-neon-orange hover:bg-neon-orange/30 font-orbitron font-medium transition-all"
        style={{ clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))' }}
      >
        <MessageSquare className="w-5 h-5" />
        分享体验
      </button>

      <CreateShareModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultTool={{
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          shortDesc: tool.shortDesc,
          logoUrl: tool.logoUrl || undefined,
          categoryName: tool.categoryName
        }}
        onSuccess={() => {
          router.refresh()
          // 发布成功自动滚动到评论区，看看别人分享
          setTimeout(() => {
            document.getElementById('share-section')?.scrollIntoView({ behavior: 'smooth' })
          }, 500)
        }}
      />
    </>
  )
}
