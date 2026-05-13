'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'

interface FriendLinkItem {
  id: number
  name: string
  url: string
  description: string | null
  sortOrder: number
}

export default function FriendLinksBar() {
  const [links, setLinks] = useState<FriendLinkItem[]>([])

  useEffect(() => {
    fetch('/api/friend-links')
      .then(res => res.json())
      .then(data => setLinks(data.links || []))
      .catch(() => {})
  }, [])

  if (links.length === 0) return null

  return (
    <div className="border-t border-cyber-border pt-6 pb-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-orbitron font-bold text-cyber-muted-foreground uppercase tracking-wider">
          <span className="text-neon-cyan">{'>'}</span> 友情链接
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-cyber-border to-transparent" />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {links.map(link => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyber-muted-foreground hover:text-neon-green transition-colors font-mono group"
          >
            {link.name}
            <ExternalLink className="w-3 h-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
          </a>
        ))}
      </div>
    </div>
  )
}
