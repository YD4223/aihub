'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function ToolsSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')

  // 挂载时拦截：URL 有 search 但未登录 → 跳登录页
  useEffect(() => {
    if (searchParams.get('search') && !localStorage.getItem('user')) {
      alert('请先登录后再使用搜索功能')
      router.replace('/login?redirect=/tools')
    }
  }, [])

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const category = searchParams.get('category')
    const source = searchParams.get('source')
    const sort = searchParams.get('sort')
    const search = searchParams.get('search')

    if (category) params.set('category', category)
    if (source) params.set('source', source)
    if (sort) params.set('sort', sort)
    if (search) params.set('search', search)

    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined || v === '') {
        params.delete(k)
      } else {
        params.set(k, v)
      }
    })
    // 搜索/排序变化时重置到第1页
    params.delete('page')
    return `/tools?${params.toString()}`
  }

  const handleSearch = () => {
    if (!localStorage.getItem('user')) {
      alert('请先登录后再使用搜索功能')
      router.push('/login?redirect=/tools')
      return
    }
    // 搜索时清除分类、来源和排序，只保留搜索词
    const params = new URLSearchParams()
    const searchValue = query.trim()
    if (searchValue) {
      params.set('search', searchValue)
    }
    router.push(`/tools?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(buildUrl({ sort: e.target.value || undefined }))
  }

  return (
    <div className="flex gap-4 items-center">
      <div className="flex-1 relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-green cursor-pointer"
          onClick={handleSearch}
        />
        <input
          type="text"
          placeholder="搜索AI工具名称、功能、标签..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="input-cyber w-full"
        />
      </div>
      <select
        defaultValue={searchParams.get('sort') || ''}
        onChange={handleSort}
        className="flex items-center gap-2 px-4 py-3 bg-cyber-card border border-cyber-border rounded-lg hover:border-neon-green text-sm font-mono text-cyber-foreground focus:outline-none focus:border-neon-green transition-colors cursor-pointer"
      >
        <option value="" className="bg-cyber-card">默认排序</option>
        <option value="stars" className="bg-cyber-card">热度最高</option>
        <option value="newest" className="bg-cyber-card">最新发布</option>
        <option value="upvotes" className="bg-cyber-card">评分最高</option>
      </select>
    </div>
  )
}
