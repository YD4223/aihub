/**
 * 图片内存缓存模块
 * 
 * 将解码后的图片 buffer 缓存在内存中，避免同一张图在短期内反复查 Supabase
 * 
 * 背景：图片代理 API 需要访问 Supabase（美国东部），每次往返 200-300ms
 * 一个页面 8 个分享 × 3 张图 = 24 次请求，没有缓存的话太慢了
 */

interface CacheEntry {
  buffer: Buffer
  mimeType: string
  createdAt: number
}

const cache = new Map<string, CacheEntry>()

// 缓存 10 分钟后自动过期
const CACHE_TTL = 10 * 60 * 1000

// 最大缓存条目数，防止内存泄漏
const MAX_CACHE_SIZE = 500

export function getImageCacheKey(shareId: number, index: number): string {
  return `${shareId}:${index}`
}

export function getCachedImage(key: string): { buffer: Buffer; mimeType: string } | null {
  const entry = cache.get(key)
  if (!entry) return null

  // 检查是否过期
  if (Date.now() - entry.createdAt > CACHE_TTL) {
    cache.delete(key)
    return null
  }

  return { buffer: entry.buffer, mimeType: entry.mimeType }
}

export function setCachedImage(key: string, buffer: Buffer, mimeType: string): void {
  // 如果缓存快满了，清理过期条目
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now()
    for (const [k, v] of cache.entries()) {
      if (now - v.createdAt > CACHE_TTL) {
        cache.delete(k)
      }
    }
  }

  cache.set(key, {
    buffer,
    mimeType,
    createdAt: Date.now(),
  })
}
