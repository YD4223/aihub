/**
 * AwesomeTop 抓取脚本
 * 数据源: https://awesometop.cn/
 * 使用 Puppeteer 抓取 Nuxt.js 渲染的页面
 */

import { prisma } from '@/lib/prisma'
import { autoCategorize } from '@/lib/categorize'
import puppeteer from 'puppeteer'

interface AwesomeTool {
  name: string
  description?: string
  url?: string
  githubUrl?: string
  tags?: string[]
}

/**
 * 抓取 AwesomeTop 页面
 */
async function fetchAwesomeTop(): Promise<AwesomeTool[]> {
  console.log('🚀 启动浏览器...')
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    console.log('📡 访问 awesometop.cn...')
    await page.goto('https://awesometop.cn/', { waitUntil: 'networkidle2', timeout: 30000 })
    
    // 等待页面加载
    await page.waitForTimeout(3000)
    
    // 提取工具数据
    const tools = await page.evaluate(() => {
      const results: Array<{name: string; description?: string; url?: string; tags?: string[]}> = []
      
      // 尝试多种选择器
      const selectors = [
        '[data-testid="tool-card"]',
        '.tool-card',
        '.card',
        '[class*="tool"]',
        '[class*="card"]',
        'article',
        '.item'
      ]
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`)
          
          elements.forEach(el => {
            const nameEl = el.querySelector('h3, h2, .title, [class*="title"], a')
            const descEl = el.querySelector('p, .description, [class*="desc"]')
            const linkEl = el.querySelector('a[href^="http"]')
            
            if (nameEl) {
              results.push({
                name: nameEl.textContent?.trim() || '',
                description: descEl?.textContent?.trim(),
                url: linkEl?.getAttribute('href') || undefined,
                tags: Array.from(el.querySelectorAll('.tag, [class*="tag"]')).map(t => t.textContent?.trim() || '').filter(Boolean)
              })
            }
          })
          
          if (results.length > 0) break
        }
      }
      
      // 如果没找到，尝试从页面文本中提取
      if (results.length === 0) {
        // 返回页面结构信息帮助调试
        return {
          debug: true,
          title: document.title,
          bodyText: document.body.innerText.substring(0, 500),
          allLinks: Array.from(document.querySelectorAll('a[href^="http"]')).slice(0, 10).map(a => ({
            text: a.textContent?.trim(),
            href: a.getAttribute('href')
          }))
        }
      }
      
      return results
    })
    
    return tools as AwesomeTool[]
  } finally {
    await browser.close()
  }
}

/**
 * 保存工具到数据库
 */
async function saveTool(tool: AwesomeTool) {
  try {
    if (!tool.name) return
    
    // 生成 slug
    const slug = tool.name.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .substring(0, 50)
    
    // 检查是否已存在
    const existing = await prisma.tool.findFirst({
      where: {
        OR: [
          { slug },
          { name: tool.name }
        ]
      }
    })
    
    if (existing) {
      console.log(`   ⏭️ 已存在: ${tool.name}`)
      return
    }
    
    // 自动分类
    const categoryId = await autoCategorize(tool)
    
    // 创建工具
    await prisma.tool.create({
      data: {
        name: tool.name,
        slug,
        description: tool.description || '',
        websiteUrl: tool.url,
        githubUrl: tool.githubUrl || tool.url,
        categoryId,
        tags: tool.tags?.join(',') || '',
        isOpenSource: true,
        source: 'AwesomeTop',
        sourceUrl: 'https://awesometop.cn/',
        status: 'approved',
        publishedAt: new Date()
      }
    })
    
    console.log(`   ✅ 新增: ${tool.name}`)
  } catch (error) {
    console.error(`   ❌ 保存失败 ${tool.name}:`, error)
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始抓取 AwesomeTop...\n')
  
  try {
    const result = await fetchAwesomeTop()
    
    // 如果是调试信息
    if ('debug' in result && result.debug) {
      console.log('页面结构：', JSON.stringify(result, null, 2))
      return
    }
    
    const tools = result as AwesomeTool[]
    console.log(`📦 获取到 ${tools.length} 个工具\n`)
    
    if (tools.length === 0) {
      console.log('⚠️ 没有获取到数据')
      return
    }
    
    // 保存到数据库
    let saved = 0
    for (const tool of tools) {
      await saveTool(tool)
      saved++
    }
    
    console.log(`\n✅ 完成！处理了 ${saved} 个工具`)
    
  } catch (error) {
    console.error('❌ 执行失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行
main()
