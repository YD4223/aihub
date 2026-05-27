'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CategoryCardData {
  name: string
  icon: string
  count: number | string
  href: string
  color: string
}

function CategoryCard({ name, icon, count, href, color }: CategoryCardData) {
  const colorMap: Record<string, { border: string; text: string; glow: string }> = {
    green: { border: 'border-neon-green', text: 'text-neon-green', glow: 'hover:shadow-neon' },
    magenta: { border: 'border-neon-magenta', text: 'text-neon-magenta', glow: 'hover:shadow-neon-secondary' },
    cyan: { border: 'border-neon-cyan', text: 'text-neon-cyan', glow: 'hover:shadow-neon-tertiary' },
    yellow: { border: 'border-neon-yellow', text: 'text-neon-yellow', glow: '' },
  }

  const colors = colorMap[color] || colorMap.green

  return (
    <Link
      href={href}
      className={`relative p-6 border ${colors.border} bg-cyber-card/30 transition-all duration-300 hover:-translate-y-1 ${colors.glow} group`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <div className={`font-orbitron font-bold ${colors.text} group-hover:text-cyber-foreground transition-colors`}>
        {name}
      </div>
      <div className="text-sm text-cyber-muted-foreground font-mono mt-1">
        {Number(count) > 0 ? `${count} 个工具` : '即将上线'}
      </div>
    </Link>
  )
}

export default function CategoryGridClient({ categories }: { categories: CategoryCardData[] }) {
  const [showAll, setShowAll] = useState(false)
  const INITIAL = 10
  const displayed = showAll ? categories : categories.slice(0, INITIAL)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-1">
        {displayed.map((cat) => (
          <CategoryCard key={cat.name} {...cat} />
        ))}
      </div>
      {categories.length > INITIAL && !showAll && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAll(true)}
            className="px-6 py-2.5 border border-neon-cyan/40 text-neon-cyan font-mono text-sm
                       transition-all duration-300 hover:bg-neon-cyan/10 hover:border-neon-cyan
                       hover:shadow-[0_0_20px_rgba(0,212,255,0.15)]"
          >
            [+ 加载更多分类]
          </button>
        </div>
      )}
      {showAll && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAll(false)}
            className="px-6 py-2.5 border border-neon-cyan/40 text-neon-cyan font-mono text-sm
                       transition-all duration-300 hover:bg-neon-cyan/10 hover:border-neon-cyan
                       hover:shadow-[0_0_20px_rgba(0,212,255,0.15)]"
          >
            [- 收起分类]
          </button>
        </div>
      )}
    </>
  )
}
