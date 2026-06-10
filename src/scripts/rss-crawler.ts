import { PrismaClient } from '@prisma/client'
import Parser from 'rss-parser'
import slugify from 'slugify'

const prisma = new PrismaClient()
const rssParser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'AI-Hub-RSS-Crawler/1.0'
  }
})

// 调用腾讯翻译 API 翻译摘要
async function translateSummary(text: string): Promise<string> {
  const secretId = process.env.TENCENT_TRANSLATE_SECRET_ID
  const secretKey = process.env.TENCENT_TRANSLATE_SECRET_KEY
  
  // 如果没有配置腾讯翻译，尝试使用本地 Ollama
  if (!secretId || !secretKey) {
    console.log('   ⚠️ 未配置腾讯翻译，尝试本地模型...')
    return translateWithLocalModel(text)
  }
  
  try {
    // 使用腾讯云 SDK
    const tencentcloud = require('tencentcloud-sdk-nodejs-tmt')
    const TmtClient = tencentcloud.tmt.v20180321.Client
    
    const clientConfig = {
      credential: {
        secretId: secretId,
        secretKey: secretKey,
      },
      region: 'ap-guangzhou',
      profile: {
        signMethod: 'TC3-HMAC-SHA256',
        httpProfile: {
          reqMethod: 'POST',
          reqTimeout: 30,
        },
      },
    }
    
    const client = new TmtClient(clientConfig)
    
    const params = {
      SourceText: text,
      Source: 'en',
      Target: 'zh',
      ProjectId: 0,
    }
    
    const result = await client.TextTranslate(params)
    return result.TargetText || ''
  } catch (error) {
    console.error('腾讯翻译失败:', error)
    // 失败后尝试本地模型
    return translateWithLocalModel(text)
  }
}

// 本地模型翻译（备用方案）
async function translateWithLocalModel(text: string): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt: `请将以下英文内容翻译成简洁流畅的中文摘要（100字以内）：\n\n${text}\n\n中文摘要：`,
        stream: false
      })
    })
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.response?.trim() || ''
  } catch (error) {
    console.error('本地翻译也失败:', error)
    return ''
  }
}

// AI 资讯 RSS 源列表
const rssSources = [
  {
    name: '量子位',
    url: 'https://www.qbitai.com/rss',
    language: 'zh',
    category: 'AI新闻'
  },
  {
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    language: 'en',
    category: '科技新闻'
  },
  {
    name: 'MarkTechPost',
    url: 'https://www.marktechpost.com/feed/',
    language: 'en',
    category: 'AI新闻'
  },
  {
    name: 'AI News',
    url: 'https://www.artificialintelligence-news.com/feed/',
    language: 'en',
    category: 'AI新闻'
  },
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    language: 'en',
    category: 'AI新闻'
  },
  {
    name: 'Ars Technica',
    url: 'https://arstechnica.com/tag/artificial-intelligence/feed/',
    language: 'en',
    category: '科技新闻'
  },
  {
    name: 'IEEE Spectrum',
    url: 'https://spectrum.ieee.org/rss/topic/artificial-intelligence',
    language: 'en',
    category: '技术博客'
  },
  {
    name: 'Nature Machine Intelligence',
    url: 'https://www.nature.com/natmachintell.rss',
    language: 'en',
    category: 'AI论文'
  },
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    language: 'en',
    category: '技术博客'
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    language: 'en',
    category: '技术博客'
  }
]

// 生成唯一 slug
function generateSlug(title: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const titleSlug = slugify(title.slice(0, 50), { lower: true, strict: true })
  return `${dateStr}-${titleSlug}`
}

// 清理 HTML 标签（先删除代码块内容，再去标签）
function stripHtml(html: string): string {
  return html
    // 先删除代码块整体（包含内容）
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '')
    .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // 段落/换行转空格
    .replace(/<\/?(p|br|li|h[1-6]|div|blockquote)[^>]*>/gi, ' ')
    // 去掉所有剩余标签
    .replace(/<[^>]*>/g, '')
    // 处理 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    // 清理多余空白
    .replace(/\s+/g, ' ')
    .trim()
}

// 生成摘要
function generateSummary(content: string, maxLength: number = 150): string {
  const text = stripHtml(content)
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

// 抓取单个 RSS 源
async function fetchRSS(source: typeof rssSources[0]): Promise<number> {
  console.log(`📡 正在抓取: ${source.name}...`)
  
  try {
    const feed = await rssParser.parseURL(source.url)
    let imported = 0
    let skipped = 0
    
    // 只取最近 7 天的文章，最多 10 篇
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentItems = (feed.items || [])
      .filter(item => {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
        return pubDate >= oneWeekAgo
      })
      .slice(0, 10)
    
    for (const item of recentItems) {
      try {
        const title = item.title?.trim() || ''
        // 优先取完整 HTML 内容，再取纯文本内容
        const rawContent = item['content:encoded'] || item.content || item.summary || ''
        const plainContent = item.contentSnippet || item.summary || ''
        const link = item.link || ''
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
        
        if (!title || !link) {
          skipped++
          continue
        }
        
        // 生成 slug
        const slug = generateSlug(title, pubDate)
        
        // 检查是否已存在
        const existing = await prisma.news.findUnique({
          where: { slug }
        })
        
        if (existing) {
          skipped++
          continue
        }
        
        // 摘要取较长版本（优先用 content:encoded 的纯文本，最长 800 字）
        const summary = generateSummary(rawContent || plainContent, 800)
        
        // 英文内容生成中文翻译（标题+摘要）
        let titleZh = null
        let summaryZh = null
        if (source.language === 'en') {
          console.log(`   🔄 翻译: ${title.slice(0, 30)}...`)
          // 翻译标题
          titleZh = await translateSummary(title)
          // 翻译摘要
          if (summary) {
            summaryZh = await translateSummary(summary)
          }
          if (titleZh) {
            console.log(`   ✅ 翻译完成`)
          }
        }
        
        // 创建新闻
        // 原文内容存纯文本版本，展示用 summary 和 summaryZh
        const cleanContent = stripHtml(rawContent || plainContent) || title
        
        await prisma.news.create({
          data: {
            title,
            titleZh,
            slug,
            summary,
            summaryZh,
            content: cleanContent.length > 100 ? cleanContent.slice(0, 2000) : cleanContent,
            sourceName: source.name,
            sourceUrl: link,
            publishedAt: pubDate,
            isAutoCrawled: true,
            viewCount: 0
          }
        })
        
        imported++
        process.stdout.write('.')
      } catch (error) {
        skipped++
        process.stdout.write('x')
      }
    }
    
    console.log(`\n   ✅ 导入: ${imported}, ⏭️ 跳过: ${skipped}`)
    return imported
  } catch (error) {
    console.error(`\n   ❌ 抓取失败:`, (error as Error).message)
    return 0
  }
}

// 主函数
async function main() {
  console.log('🚀 开始抓取 AI 资讯 RSS...\n')
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`)
  console.log(`📊 共 ${rssSources.length} 个 RSS 源\n`)
  
  let totalImported = 0
  
  for (const source of rssSources) {
    const count = await fetchRSS(source)
    totalImported += count
    console.log('')
  }
  
  // 统计
  const totalNews = await prisma.news.count()
  const autoCrawled = await prisma.news.count({
    where: { isAutoCrawled: true }
  })
  
  console.log('\n📊 抓取完成:')
  console.log(`   本次新增: ${totalImported} 篇文章`)
  console.log(`   资讯总数: ${totalNews} 篇`)
  console.log(`   自动抓取: ${autoCrawled} 篇`)
  
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
