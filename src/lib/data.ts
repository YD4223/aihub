import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

// ============================================
// 首页数据缓存层
// 利用 Next.js 内置 unstable_cache 为每个查询加缓存
// 按数据更新频率设置不同的 revalidate 时间
// ============================================

/** 推荐工具 - 2分钟缓存 */
export const getFeaturedTools = unstable_cache(
  async () => {
    return prisma.tool.findMany({
      where: { isFeatured: true, isActive: true },
      include: { category: true },
      orderBy: { stars: 'desc' },
      take: 4,
    })
  },
  ['home-featured-tools'],
  { revalidate: 120 }
)

/** 最新工具 - 2分钟缓存 */
export const getLatestTools = unstable_cache(
  async () => {
    return prisma.tool.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  },
  ['home-latest-tools'],
  { revalidate: 120 }
)

/** 工具总数 - 5分钟缓存 */
export const getTotalTools = unstable_cache(
  async () => {
    return prisma.tool.count({ where: { isActive: true } })
  },
  ['home-total-tools'],
  { revalidate: 300 }
)

/** 开源工具数 - 5分钟缓存 */
export const getTotalOpensource = unstable_cache(
  async () => {
    return prisma.tool.count({ where: { isActive: true, isOpenSource: true } })
  },
  ['home-total-opensource'],
  { revalidate: 300 }
)

/** 分类总数 - 5分钟缓存 */
export const getTotalCategories = unstable_cache(
  async () => {
    return prisma.category.count()
  },
  ['home-total-categories'],
  { revalidate: 300 }
)

/** 各分类工具数量聚合 - 5分钟缓存 */
export const getCategoryCounts = unstable_cache(
  async () => {
    return prisma.tool.groupBy({
      by: ['categoryId'],
      where: { isActive: true },
      _count: { id: true },
    })
  },
  ['home-category-counts'],
  { revalidate: 300 }
)

/** 分类列表 - 5分钟缓存 */
export const getCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      select: { id: true, slug: true, name: true },
    })
  },
  ['home-categories'],
  { revalidate: 300 }
)

/** 最新资讯 - 5分钟缓存 */
export const getLatestNews = unstable_cache(
  async () => {
    return prisma.news.findMany({
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        imageUrl: true,
        sourceName: true,
        publishedAt: true,
        createdAt: true,
      },
    })
  },
  ['home-latest-news'],
  { revalidate: 300 }
)

/** 最新用户分享 - 1分钟缓存 */
export const getLatestShares = unstable_cache(
  async () => {
    return prisma.share.findMany({
      where: { status: 'approved' },
      include: {
        tool: { include: { category: true } },
        user: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
  },
  ['home-latest-shares'],
  { revalidate: 60 }
)
