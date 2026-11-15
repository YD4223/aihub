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
import { isTransientDbError } from '@/lib/db-retry'

// 数据库瞬时错误自动重试（连接池耗尽 P2024 / 网络不可达 P1001 / 连接被关闭等）
async function withRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      if (!isTransientDbError(err) || i === retries - 1) throw err
      const wait = 1000 * Math.pow(2, i)  // 1s, 2s, 4s, 8s, 16s
      console.log(`⏳ 数据库瞬时繁忙，${wait / 1000}s 后重试 (${i + 1}/${retries})...`)
      await new Promise(r => setTimeout(r, wait))
    }
  }
  throw new Error('重试次数用尽')
}

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

/** 基础 slug。generateSlug 会把中文等非 ASCII 字符全部清空，此时退化用 GitHub owner-repo */
function makeBaseSlug(name: string, githubUrl?: string): string {
  let slug = generateSlug(name)
  if (!slug) {
    const gh = githubUrl?.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/i)
    if (gh) slug = generateSlug(`${gh[1]}-${gh[2]}`)
  }
  return slug || 'tool'
}

/**
 * 从基础 slug 分配一个本轮内唯一的 slug。
 * 冲突时优先用 owner-repo（同名不同 owner 是不同项目），仍冲突则追加序号。
 * 纯同步执行，调用方须在任何 await 之前调用，避免并发任务拿到同一个 slug。
 */
function allocateSlug(base: string, githubUrl: string | undefined, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  const gh = githubUrl?.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/i)
  if (gh) {
    const alt = generateSlug(`${gh[1]}-${gh[2]}`)
    if (alt && !used.has(alt)) {
      used.add(alt)
      return alt
    }
  }
  let n = 2
  while (used.has(`${base}-${n}`)) n++
  const slug = `${base}-${n}`
  used.add(slug)
  return slug
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

/**
 * 过滤 fork farm：同一批次内「同名 + owner 各不相同」的仓库达到 3 个以上，
 * 基本可判定为刷量农场。真实项目不会出现多个不同 owner 同日使用同一个仓库名，
 * 而农场会用大量账号 fork 同一个仓库、改描述来占满 GitHub 搜索结果。
 * 实例：2026-11-15 一次抓到 19 个不同账号的 "GitHub-Copilot-app"。
 */
function dropForkFarms<T extends { name?: string; githubUrl?: string }>(tools: T[]): T[] {
  const groups = new Map<string, T[]>()
  for (const t of tools) {
    const key = (t.name || '').trim().toLowerCase()
    if (!key) continue
    const arr = groups.get(key)
    if (arr) arr.push(t)
    else groups.set(key, [t])
  }
  const spam = new Set<T>()
  for (const group of groups.values()) {
    if (group.length < 3) continue
    const owners = new Set(
      group
        .map(t => t.githubUrl?.match(/github\.com\/([^/]+)\//i)?.[1]?.toLowerCase())
        .filter(Boolean) as string[]
    )
    if (owners.size >= 3) group.forEach(t => spam.add(t))
  }
  if (spam.size > 0) {
    console.log(`🧹 过滤疑似 fork farm: ${spam.size} 条（同名不同 owner 批量刷榜）`)
  }
  return tools.filter(t => !spam.has(t))
}

/**
 * 过滤 API 转售 SEO 农场：同一团伙用大量新注册账号批量建仓库，把
 * 「模型名 + api/gateway/prompts」堆进仓库名与描述，抢占模型名的搜索流量。
 * 这类仓库 stars 靠刷、描述是报价单，对导航站是纯噪音。
 * 2026-11-15 全库排查出 77 条，命中四条规则，误杀 0（34 个知名 owner 项目全未命中）。
 */
function dropSeoFarms<T extends { name?: string; githubUrl?: string; shortDesc?: string; description?: string }>(tools: T[]): T[] {
  // 规则A：归一化后模型名重复两遍，如 seedance2.5-seedance-2.5-api-cn → seedance25 ×2
  const repeatTwice = (name: string): boolean => {
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (let len = Math.floor(n.length / 2); len >= 6; len--) {
      if (n.slice(0, len) === n.slice(len, len * 2)) return true
    }
    return false
  }

  // 规则B：apimart 批量账号 或 official-api-(ja|cn|ko) 后缀
  const isMarketingOwner = (t: T): boolean => {
    const owner = (t.githubUrl?.match(/github\.com\/([^/]+)\//i)?.[1] || '').toLowerCase()
    return /^apimart/.test(owner) || /official-api-(ja|cn|ko)$/i.test(t.name || '')
  }

  // 规则C：描述是 API 报价单，如「$0.0961/秒 + OpenAI 兼容网关 + 最低充值 1 美元」
  // 价格必须是「小数单价」或「按秒/按张」这类计量词。
  // 不能用泛化的 `$\d` 匹配：真实项目也会写硬件价格，如
  // esp32-iphone-agent 的「a $7 ESP32 … any OpenAI-compatible vision model」
  // 会被误判（4,983★ 真实项目），农场用的是 $0.0961 这种小数单价。
  const isSoftAd = (t: T): boolean => {
    const d = `${t.shortDesc || ''} ${t.description || ''}`.toLowerCase()
    const hasPrice = /\$\s?\d+\.\d{2,}|per[- ]?second|per[- ]?image|每秒|每张|起充|最低充值/.test(d)
    const hasSell = /model id|模型\s*id|gateway key|openai\s*兼容|openai-compatible|compatible api/.test(d)
    return hasPrice && hasSell
  }

  // 规则D：名字连字符堆砌 ≥3 段 + 变现后缀 + 版本号，且描述提到 model id
  const isNameStacked = (t: T): boolean => {
    const name = t.name || ''
    const segs = name.toLowerCase().split(/[-_\s]+/).filter(Boolean)
    const hasMoneyWord = /(^|-)(api|gateway|prompts?|4k|2k)(-|$)|official-api/i.test(name)
    const hasVersion = /\d/.test(name)
    const descModelId = /model id|模型\s*id|model-id/i.test(`${t.shortDesc || ''} ${t.description || ''}`)
    return segs.length >= 3 && hasMoneyWord && hasVersion && descModelId
  }

  const spam = new Set<T>()
  for (const t of tools) {
    const name = t.name || ''
    if (repeatTwice(name) || isMarketingOwner(t) || isSoftAd(t) || isNameStacked(t)) spam.add(t)
  }
  if (spam.size > 0) {
    console.log(`🧹 过滤 API 转售 SEO 农场: ${spam.size} 条（模型名堆砌/报价单描述）`)
    spam.forEach(t => console.log(`   跳过: ${t.name}`))
  }
  return tools.filter(t => !spam.has(t))
}

async function saveTools(rawTools: any[]) {
  let saved = 0
  let skipped = 0

  const tools = dropSeoFarms(dropForkFarms(rawTools))
  if (tools.length === 0) return { saved, skipped }
  
  // 第一步：批量预查所有 slug、websiteUrl、githubUrl（1次查询代替 N 次逐条查询）
  const slugs = tools.map(t => generateSlug(t.name))
  const urls = tools.flatMap(t => [t.websiteUrl, t.githubUrl].filter(Boolean) as string[])
  
  const existingTools = await withRetry(() => prisma.tool.findMany({
    where: {
      OR: [
        { slug: { in: slugs } },
        ...(urls.length > 0 ? [{ websiteUrl: { in: urls } }] : []),
        ...(urls.length > 0 ? [{ githubUrl: { in: urls } }] : []),
      ]
    },
    select: { id: true, slug: true, name: true, websiteUrl: true, githubUrl: true }
  }))
  // URL 统一归一化（去尾斜杠 + 小写），与 main() 判重口径一致；
  // 两边口径不同会导致「main 认为重复、这里认为不重复」进而插入重复记录
  const normUrl = (u?: string | null) => (u ? u.replace(/\/$/, '').toLowerCase() : '')
  const existingSlugs = new Set(existingTools.map(t => t.slug))
  const existingUrls = new Set(
    existingTools.flatMap(t => [normUrl(t.websiteUrl), normUrl(t.githubUrl)]).filter(Boolean)
  )
  const existingNames = new Set(existingTools.map(t => t.name.toLowerCase()))
  const existingMap = new Map(existingTools.map(t => [t.slug, t]))
  
  // 预缓存"其他工具"分类（避免并行时争抢连接）
  let otherCategoryId: number | null = null
  try {
    const other = await withRetry(() => prisma.category.findFirst({ where: { name: '其他工具' } }))
    otherCategoryId = other?.id || null
  } catch {}
  
  // 第二步：分批并行处理（每批3个，不超过连接池限制）
  const CONCURRENCY = 3
  const results: { status: string; name: string }[] = []
  // 已占用的 slug = 数据库已有 + 本轮已分配。原实现只用创建前的快照，
  // 同一次运行里两个同名项目会算出同一个 slug，第二个必然撞 P2002
  const usedSlugs = new Set(existingSlugs)
  
  for (let i = 0; i < tools.length; i += CONCURRENCY) {
    const batch = tools.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(async (tool) => {
      // 先用基础 slug 做去重判断（不受后续编号影响）
      const base = makeBaseSlug(tool.name, tool.githubUrl)
      const ghKey = normUrl(tool.githubUrl)
      const wKey = normUrl(tool.websiteUrl)
      // 创建成功后立即记入本轮去重集合，避免同批其他条目（URL 大小写不同 / 同名）重复插入
      const markCreated = (finalSlug: string) => {
        if (ghKey) existingUrls.add(ghKey)
        if (wKey) existingUrls.add(wKey)
        existingSlugs.add(finalSlug)
        existingNames.add((tool.name || '').toLowerCase())
      }

      // 判重只认 URL（同一项目才跳过）。slug 撞车不等于同一项目——
      // 同名不同 owner 是不同的仓库，交给 allocateSlug 分配新 slug，不能直接丢弃
      const isDuplicate = (ghKey && existingUrls.has(ghKey)) ||
        (wKey && existingUrls.has(wKey)) ||
        (!ghKey && existingNames.has((tool.name || '').toLowerCase()))

      if (isDuplicate) {
        const existing = existingTools.find(t =>
          (ghKey && normUrl(t.githubUrl) === ghKey) || (wKey && normUrl(t.websiteUrl) === wKey)
        )
        if (existing) {
          try {
            await withRetry(() => prisma.tool.update({
              where: { id: existing.id },
              data: { publishedAt: tool.publishedAt ? new Date(tool.publishedAt) : undefined }
            }))
          } catch {}
        }
        return { status: 'skipped', name: tool.name }
      }
      
      // 去重通过后再分配本轮唯一的 slug（同步完成，不与其他并发任务交错）
      const slug = allocateSlug(base, tool.githubUrl, usedSlugs)

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
      
      const data = {
        name: cleanText(tool.name),
        slug,
        // 有内容就写 description：原先只在 >110 字时才写，导致短描述工具
        // description 永久为空（翻译流程只翻译已存在字段，补不回来）
        ...(desc.trim() ? { description: desc } : {}),
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

      try {
        await withRetry(() => prisma.tool.create({ data }))
        markCreated(slug)
        return { status: 'saved', name: tool.name }
      } catch (e: any) {
        // 兜底：分配后数据库又出现同 slug（并发写入）时，换带序号的 slug 再试一次。
        // 单条失败绝不能拖垮整批 Promise.all，否则已成功的条目也统计不到
        if (e?.code === 'P2002') {
          const fallback = allocateSlug(`${base}-${Date.now().toString(36)}`, tool.githubUrl, usedSlugs)
          try {
            await withRetry(() => prisma.tool.create({ data: { ...data, slug: fallback } }))
            markCreated(fallback)
            return { status: 'saved', name: tool.name }
          } catch {}
        }
        console.log(`⚠️ 保存失败已跳过: ${tool.name} (${e?.code || e?.message || 'unknown'})`)
        return { status: 'failed', name: tool.name }
      }
    }))
    results.push(...batchResults)
  }
  
  let failed = 0
  for (const r of results) {
    if (r.status === 'saved') {
      saved++
      console.log(`✅ 已保存: ${r.name}`)
    } else if (r.status === 'failed') {
      failed++
    } else {
      skipped++
    }
  }
  if (failed > 0) console.log(`⚠️ 失败 ${failed} 条（已逐条跳过，未影响其他条目）`)
  
  return { saved, skipped }
}

async function main() {
  console.log('🚀 === 开始抓取 AI 工具 ===')
  console.log(`📅 时间: ${new Date().toLocaleString()}\n`)

  // =========================================================
  // 阶段 1: 查询现有数据库，准备去重
  // =========================================================
  console.log('📦 查询现有工具列表...')
  const existingTools = await withRetry(() => prisma.tool.findMany({
    select: { slug: true, name: true, githubUrl: true, websiteUrl: true },
  }))
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
    if (existingUrls.has(ghUrl) || existingUrls.has(wUrl)) return false
    // 有 githubUrl 时只认 URL：同名不同仓库是不同项目（如 EvoMap/AutoResearch 与 karpathy/autoresearch），
    // 按裸名比对会把它们误挡在库外
    if (!ghUrl && existingNames.has(name)) return false
    return true
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
    if (existingUrls.has(ghUrl) || existingUrls.has(wUrl)) return false
    if (!ghUrl && existingNames.has(name)) return false
    return true
  })
  console.log(`\n📦 近期项目: 共获取 ${githubTools.length}，新增 ${recentNew.length}\n`)

  // =========================================================
  // 阶段 4: 去重合并并保存
  // =========================================================
  const allNewTools = [...recentNew]
  const uniqueTools = allNewTools.filter((tool, index, self) =>
    index === self.findIndex(t => {
      // 同一轮里去重也以 githubUrl 为准，没有 URL 才退回按名字
      if (tool.githubUrl && t.githubUrl) {
        return t.githubUrl.replace(/\/$/, '').toLowerCase() === tool.githubUrl.replace(/\/$/, '').toLowerCase()
      }
      return t.name === tool.name || (t.websiteUrl && tool.websiteUrl && t.websiteUrl === tool.websiteUrl)
    })
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
        timeout: 600000,
        stdio: 'inherit', // 直接把日志透传，避免 pipe 缓冲导致看起来"卡住"
        maxBuffer: 10 * 1024 * 1024,
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
      // 原 60s 不够：npx 启动(~4s) + 本机到 Supabase 建连(15s) + 200 条 URL
      // 分 40 批流式提交、每批间隔 500ms(20s+) + 40 次 HTTP 往返，实测 60~90s，
      // 必然撞 ETIMEDOUT。给足余量，同时覆盖脚本内的 DB 重试。
      timeout: 180000,
    })
    console.log('✅ IndexNow 提交完成')
  } catch (err) {
    console.log('⚠️ IndexNow 提交失败（不影响已保存的工具）:', err instanceof Error ? err.message : err)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
