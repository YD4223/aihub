'use client'

import { Search, ChevronDown } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const sortOptions = [
  { value: '', label: '默认排序' },
  { value: 'stars', label: '热度最高' },
  { value: 'newest', label: '最新发布' },
  { value: 'upvotes', label: '评分最高' },
]

export default function ToolsSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [sortOpen, setSortOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 挂载时拦截：URL 有 search 但未登录 → 跳登录页
  useEffect(() => {
    if (searchParams.get('search') && !localStorage.getItem('user')) {
      alert('请先登录后再使用搜索功能')
      router.replace('/login?redirect=/tools')
    }
  }, [])

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const handleSort = (value: string) => {
    router.push(buildUrl({ sort: value || undefined }))
    setSortOpen(false)
  }

  const currentSort = searchParams.get('sort') || ''
  const currentLabel = sortOptions.find(o => o.value === currentSort)?.label || '排序'

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

      {/* 自定义排序下拉 */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="flex items-center gap-2 px-4 py-3 bg-cyber-input border border-cyber-border text-neon-green font-mono text-sm hover:border-neon-green hover:shadow-neon focus:border-neon-green focus:shadow-neon focus:outline-none transition-all duration-200 cursor-pointer whitespace-nowrap min-w-[130px]"
        >
          <span className={currentSort ? 'text-neon-green' : 'text-cyber-muted-foreground'}>
            {currentLabel}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-neon-green transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {sortOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-full bg-cyber-card border border-cyber-border shadow-[0_0_20px_rgba(0,255,136,0.15)]">
            {sortOptions.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => handleSort(opt.value)}
                className={`w-full text-left px-4 py-2.5 font-mono text-sm transition-all duration-150
                  ${currentSort === opt.value
                    ? 'text-neon-green bg-neon-green/10 border-l-2 border-neon-green'
                    : 'text-cyber-foreground hover:bg-cyber-muted/30 hover:text-neon-green hover:pl-5'
                  }
                  ${i < sortOptions.length - 1 ? 'border-b border-cyber-border/50' : ''}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
