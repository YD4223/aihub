/**
 * 最新 AI 工具抓取脚本
 * 从 GitHub 和 RSS 源抓取最近发布的 AI 工具
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'
import Parser from 'rss-parser'
import { prisma } from '@/lib/prisma'
import { autoCategorize } from '@/lib/categorize'

// 加载 .env 文件（tsx 不会自动加载）
try {
  const envPath = resolve(process.cwd(), '.env')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim()
      const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
  console.log('✅ 已加载 .env 环境变量')
} catch {
  console.log('⚠️ 未找到 .env 文件，使用系统环境变量')
}

const rssParser = new Parser()

// RSS 源配置
const rssSources = [
  { name: '量子位', url: 'https://www.qbitai.com/rss', type: 'news' },
  { name: 'MarkTechPost', url: 'https://www.marktechpost.com/feed/', type: 'news' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', type: 'news' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', type: 'news' },
]

const DAYS_LIMIT = 30

// 从 RSS 源获取最新 AI 工具
async function fetchFromRSS(itemLimit: number = 10): Promise<any[]> {
  const thirtyDaysAgo = new Date(Date.now() - DAYS_LIMIT * 24 * 60 * 60 * 1000)
  
  // 并行抓取所有 RSS 源
  const results = await Promise.allSettled(rssSources.map(async (source) => {
    console.log(`📡 正在抓取: ${source.name}`)
    const feed = await rssParser.parseURL(source.url)
    const items: any[] = []
    
    for (const item of feed.items?.slice(0, itemLimit) || []) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
      if (pubDate < thirtyDaysAgo) continue
      
      const title = item.title || ''
      const content = item.content || item['content:encoded'] || item.summary || ''
      const link = item.link || ''
      
      // 区分工具关键词和泛AI关键词
      const toolKeywords = ['发布', '新品', '推出', '上线', 'launch', 'release', 'announces', 'introduces']
      const aiKeywords = ['AI', 'LLM', 'ChatGPT']
      
      const lowerTitle = title.toLowerCase()
      const lowerContent = content.toLowerCase()
      
      const hasToolKeyword = toolKeywords.some(kw => lowerTitle.includes(kw))
      const hasGitHub = !!extractGitHubUrl(content)
      const isShortTitle = title.length < 35  // 短标题更像工具名
      const hasAIKeyword = aiKeywords.some(kw => lowerTitle.includes(kw.toLowerCase()) || lowerContent.includes(kw.toLowerCase()))
      
      // 满足任一条件才算工具：
      // 1. 有明确发布/推出等关键词
      // 2. 有 GitHub 链接（开源工具）
      // 3. 提到AI且标题很短（像工具名而非新闻标题）
      const isAITool = hasToolKeyword || hasGitHub || (hasAIKeyword && isShortTitle)
      
      if (isAITool) {
        items.push({
          name: title.split('：')[0].split('|')[0].slice(0, 50),
          description: content.replace(/<[^>]*>/g, '').slice(0, 200),
          websiteUrl: link,
          githubUrl: extractGitHubUrl(content) || '',
          stars: 0,
          publishedAt: pubDate.toISOString(),
          source: source.name,
          sourceUrl: link,
          tags: extractTags(title + ' ' + content),
          isOpenSource: !!extractGitHubUrl(content)
        })
      }
    }
    
    console.log(`✅ ${source.name}: 获取 ${items.length} 条`)
    return items
  }))
  
  const tools: any[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      tools.push(...result.value)
    } else {
      console.error(`❌ RSS源抓取失败:`, result.reason?.message || result.reason)
    }
  }
  
  return tools
}

function extractGitHubUrl(text: string): string | null {
  const match = text.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+/)
  return match ? match[0] : null
}

function extractTags(text: string): string {
  const tagMap: Record<string, string> = {
    '图像': '图像生成', '绘画': '图像生成', '视频': '视频生成',
    '音频': '音频处理', '音乐': '音频处理', '写作': '写作助手',
    '代码': '代码助手', '编程': '代码助手', '搜索': '搜索引擎',
    '翻译': '翻译工具', '聊天': '聊天对话', '对话': '聊天对话',
    '设计': '设计工具', '办公': '办公效率', '教育': '教育学习',
    '医疗': '健康医疗', '金融': '金融理财',
    'image': '图像生成', 'video': '视频生成', 'audio': '音频处理',
    'code': '代码助手', 'search': '搜索引擎', 'chat': '聊天对话',
    'chatbot': '聊天对话', 'design': '设计工具', 'productivity': '办公效率',
  }
  
  const lowerText = text.toLowerCase()
  const tags: string[] = []
  
  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (lowerText.includes(keyword.toLowerCase()) && !tags.includes(tag)) {
      tags.push(tag)
    }
  }
  
  return tags.slice(0, 3).join(',') || 'AI工具'
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 50)
}

// Clean text to prevent SQLite hex escape / unicode errors
function cleanText(text: string | undefined | null): string {
  if (!text) return ''
  let result = text
  // Remove literal \uXXXX sequences that are incomplete or invalid (like \ud83e without closing)
  result = result.replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '')
  // Remove literal \xXX sequences that are incomplete
  result = result.replace(/\\x[0-9a-fA-F]?(?![0-9a-fA-F])/g, '')
  // Remove control characters
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  // Remove lone surrogate characters
  result = result.replace(/[\uD800-\uDFFF]/g, '')
  return result.slice(0, 500)
}

async function saveTools(tools: any[]) {
  let saved = 0
  let skipped = 0
  
  if (tools.length === 0) return { saved, skipped }
  
  // 第一步：批量预查所有 slug、websiteUrl、githubUrl（1次查询代替 N 次逐条查询）
  const slugs = tools.map(t => generateSlug(t.name))
  const urls = tools.flatMap(t => [t.websiteUrl, t.githubUrl].filter(Boolean) as string[])
  
  const existingTools = await prisma.tool.findMany({
    where: {
      OR: [
        { slug: { in: slugs } },
        ...(urls.length > 0 ? [{ websiteUrl: { in: urls } }] : []),
        ...(urls.length > 0 ? [{ githubUrl: { in: urls } }] : []),
      ]
    },
    select: { id: true, slug: true, websiteUrl: true, githubUrl: true }
  })
  const existingSlugs = new Set(existingTools.map(t => t.slug))
  const existingUrls = new Set(existingTools.flatMap(t => [t.websiteUrl, t.githubUrl].filter(Boolean)))
  const existingMap = new Map(existingTools.map(t => [t.slug, t]))
  
  // 预缓存"其他工具"分类（避免并行时争抢连接）
  let otherCategoryId: number | null = null
  try {
    const other = await prisma.category.findFirst({ where: { name: '其他工具' } })
    otherCategoryId = other?.id || null
  } catch {}
  
  // 第二步：分批并行处理（每批3个，不超过连接池限制）
  const CONCURRENCY = 3
  const results: { status: string; name: string }[] = []
  
  for (let i = 0; i < tools.length; i += CONCURRENCY) {
    const batch = tools.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(async (tool) => {
      const slug = generateSlug(tool.name)
      
      // 跳过已存在的（slug、websiteUrl、githubUrl 任一匹配即跳过）
      if (existingSlugs.has(slug) || 
          (tool.websiteUrl && existingUrls.has(tool.websiteUrl)) ||
          (tool.githubUrl && existingUrls.has(tool.githubUrl))) {
        const existing = existingMap.get(slug) || 
          existingTools.find(t => t.websiteUrl === tool.websiteUrl || t.githubUrl === tool.githubUrl)
        if (existing) {
          await prisma.tool.update({
            where: { id: existing.id },
            data: { publishedAt: tool.publishedAt ? new Date(tool.publishedAt) : undefined }
          })
        }
        return { status: 'skipped', name: tool.name }
      }
      
      // 自动分类（纯本地关键词匹配，很快）
      let categoryId = null
      try {
        categoryId = await autoCategorize({
          name: tool.name,
          description: tool.shortDesc || tool.description,
          tags: tool.tags,
        })
      } catch {}
      
      if (!categoryId) {
        categoryId = otherCategoryId
      }
      
      const desc = tool.shortDesc || tool.description || ''
      
      await prisma.tool.create({
        data: {
          name: cleanText(tool.name),
          slug,
          ...(desc.length > 110 ? { description: desc } : {}),
          shortDesc: desc.slice(0, 100),
          websiteUrl: tool.websiteUrl || '',
          githubUrl: tool.githubUrl || '',
          stars: tool.stars || 0, upvotes: 0,
          isOpenSource: tool.isOpenSource,
          tags: cleanText(tool.tags), source: cleanText(tool.source),
          sourceUrl: cleanText(tool.sourceUrl),
          publishedAt: tool.publishedAt ? new Date(tool.publishedAt) : new Date(),
          categoryId, status: 'approved', isActive: true
        }
      })
      return { status: 'saved', name: tool.name }
    }))
    results.push(...batchResults)
  }
  
  for (const r of results) {
    if (r.status === 'saved') {
      saved++
      console.log(`✅ 已保存: ${r.name}`)
    } else {
      skipped++
    }
  }
  
  return { saved, skipped }
}

async function main() {
  console.log('🚀 === 开始抓取 AI 工具 ===')
  console.log(`📅 时间: ${new Date().toLocaleString()}\n`)

  // =========================================================
  // 阶段 1: 查询现有数据库，准备去重
  // =========================================================
  console.log('📦 查询现有工具列表...')
  const existingTools = await prisma.tool.findMany({
    select: { slug: true, name: true, githubUrl: true, websiteUrl: true },
  })
  const existingUrls = new Set<string>()
  const existingNames = new Set<string>()
  for (const t of existingTools) {
    existingNames.add(t.name.toLowerCase())
    if (t.githubUrl) existingUrls.add(t.githubUrl.replace(/\/$/, '').toLowerCase())
    if (t.websiteUrl) existingUrls.add(t.websiteUrl.replace(/\/$/, '').toLowerCase())
  }
  console.log(`📊 数据库已有 ${existingTools.length} 个工具\n`)

  // =========================================================
  // 阶段 2: 爬取热门项目（补缺口）
  // =========================================================
  console.log('🔥 === 阶段 1: 爬取热门项目（补缺口） ===')
  let hotTools: any[] = []
  try {
    console.log('📦 启动 GitHub 热门搜索子进程...')
    const result = execSync('npx tsx src/scripts/github-search.ts --hot', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 180000,
      env: { ...process.env },
    })
    const jsonMatch = result.match(/__GITHUB_RESULTS__=([\s\S]+?)=__END__/)
    if (jsonMatch) {
      hotTools = JSON.parse(jsonMatch[1])
    }
  } catch (err) {
    console.error('❌ 热门搜索子进程失败:', err instanceof Error ? err.message : err)
  }

  // 过滤掉已存在的
  const hotNew = hotTools.filter(t => {
    const name = t.name?.toLowerCase() || ''
    const ghUrl = t.githubUrl?.replace(/\/$/, '').toLowerCase() || ''
    const wUrl = t.websiteUrl?.replace(/\/$/, '').toLowerCase() || ''
    return !existingNames.has(name) && !existingUrls.has(ghUrl) && !existingUrls.has(wUrl)
  })
  console.log(`\n🔥 热门项目: 共获取 ${hotTools.length}，新增 ${hotNew.length}\n`)

  let hotSaved = 0, hotSkipped = 0
  if (hotNew.length > 0) {
    const result = await saveTools(hotNew)
    hotSaved = result.saved
    hotSkipped = result.skipped
    // 把新增的加入去重集合，避免阶段3重复
    for (const t of hotNew) {
      existingNames.add(t.name?.toLowerCase() || '')
      if (t.githubUrl) existingUrls.add(t.githubUrl.replace(/\/$/, '').toLowerCase())
      if (t.websiteUrl) existingUrls.add(t.websiteUrl.replace(/\/$/, '').toLowerCase())
    }
  }

  // =========================================================
  // 阶段 3: 爬取近期新项目
  // =========================================================
  console.log('📦 === 阶段 2: 爬取近期新项目 ===')
  let githubTools: any[] = []
  try {
    console.log('📦 启动 GitHub 近期搜索子进程...')
    const result = execSync('npx tsx src/scripts/github-search.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 180000,
      env: { ...process.env },
    })
    const jsonMatch = result.match(/__GITHUB_RESULTS__=([\s\S]+?)=__END__/)
    if (jsonMatch) {
      githubTools = JSON.parse(jsonMatch[1])
    }
  } catch (err) {
    console.error('❌ GitHub 近期搜索子进程失败:', err instanceof Error ? err.message : err)
  }

  // 过滤掉已存在的
  const recentNew = githubTools.filter(t => {
    const name = t.name?.toLowerCase() || ''
    const ghUrl = t.githubUrl?.replace(/\/$/, '').toLowerCase() || ''
    const wUrl = t.websiteUrl?.replace(/\/$/, '').toLowerCase() || ''
    return !existingNames.has(name) && !existingUrls.has(ghUrl) && !existingUrls.has(wUrl)
  })
  console.log(`\n📦 近期项目: 共获取 ${githubTools.length}，新增 ${recentNew.length}\n`)

  // =========================================================
  // 阶段 4: 去重合并并保存
  // =========================================================
  const allNewTools = [...recentNew]
  const uniqueTools = allNewTools.filter((tool, index, self) =>
    index === self.findIndex(t => t.name === tool.name || (t.websiteUrl && tool.websiteUrl && t.websiteUrl === tool.websiteUrl))
  )

  console.log(`\n📊 共获取 ${uniqueTools.length} 个唯一新工具`)

  const { saved, skipped } = await saveTools(uniqueTools)
  console.log(`\n✨ === 抓取完成 ===`)
  console.log(`🔥 热门新增: ${hotSaved}/${hotNew.length}`)
  console.log(`📦 近期新增: ${saved}/${uniqueTools.length}`)
  console.log(`⏭️  跳过(已存在): ${skipped}`)

  // 如果有新工具，自动翻译英文简介
  const totalNew = hotSaved + saved
  if (totalNew > 0) {
    console.log(`\n🌐 检测到 ${totalNew} 个新工具，启动翻译...`)
    try {
      execSync('npx tsx scripts/batch-translate.ts', {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 300000,
      })
    } catch (err) {
      console.error('⚠️ 翻译过程出错（不影响已保存的工具）:', err instanceof Error ? err.message : err)
    }
  }

  // 补全有 GitHub 链接但 stars=0 的 star 数
  console.log('\n⭐ 检查并补全 GitHub star 数...')
  try {
    execSync('npx tsx scripts/backfill-stars.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 120000,
    })
  } catch (err) {
    console.error('⚠️ 补 star 过程出错:', err instanceof Error ? err.message : err)
  }

  // 通知搜索引擎内容已更新
  console.log('\n🔔 通知 IndexNow 搜索引擎内容已更新...')
  try {
    execSync('npx tsx scripts/submit-indexnow.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 60000,
    })
    console.log('✅ IndexNow 提交完成')
  } catch (err) {
    console.log('⚠️ IndexNow 提交失败（不影响已保存的工具）:', err instanceof Error ? err.message : err)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
