import { MetadataRoute } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ai999999.top'

  // 获取所有已批准的工具
  const tools = await prisma.tool.findMany({
    where: { status: 'approved', isActive: true },
    select: { slug: true, updatedAt: true }
  })

  // 获取所有分类
  const categories = await prisma.category.findMany({
    select: { slug: true }
  })

  // 获取所有资讯
  const news = await prisma.news.findMany({
    select: { id: true, publishedAt: true }
  })

  // 静态页面
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/tools`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/trending`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/opensource`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/user-share`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/submit`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
  ]

  // 工具详情页
  const toolPages = tools.map(tool => ({
    url: `${baseUrl}/tools/${tool.slug}`,
    lastModified: tool.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8
  }))

  // 分类页
  const categoryPages = categories.map(cat => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7
  }))

  // 资讯详情页
  const newsPages = news.map(article => ({
    url: `${baseUrl}/news/${article.id}`,
    lastModified: article.publishedAt || new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5
  }))

  await prisma.$disconnect()

  return [...staticPages, ...toolPages, ...categoryPages, ...newsPages]
}
