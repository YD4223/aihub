'use client'

import { useEffect } from 'react'

export default function ViewTracker({ toolId }: { toolId: number }) {
  useEffect(() => {
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'tool', targetId: toolId })
    }).catch(() => {})
  }, [toolId])

  return null
}
