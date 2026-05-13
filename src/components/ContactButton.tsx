'use client'

import { Cpu } from 'lucide-react'

export default function ContactButton() {
  const qq = '508002830'
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(qq)
        alert('QQ号 ' + qq + ' 已复制到剪贴板，打开QQ搜索即可添加')
      }}
      className="inline-flex items-center gap-2 px-6 py-2.5 border border-cyber-border rounded-lg text-cyber-muted-foreground font-orbitron text-sm uppercase tracking-wider hover:border-neon-green hover:text-neon-green transition-colors"
    >
      <Cpu className="w-4 h-4" />
      联系我们
    </button>
  )
}
