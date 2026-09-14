/**
 * IndexNow 流式推送脚本（Streaming Mode）
 * 
 * 功能：
 * 1. 读取站点 sitemap.xml
 * 2. 解析所有 URL
 * 3. 分批流式推送至 IndexNow API（每批 5 条，间隔 1000ms，Bing 推荐流式模式）
 * 
 * 用法：
 *   npm run indexnow                  # 推送 sitemap 中所有 URL
 *   npm run indexnow -- --limit 200   # 只推送前 200 条（CI 使用）
 *   npm run indexnow -- --url "..."   # 推送单条 URL
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const INDEXNOW_API = 'https://api.indexnow.org/indexnow'
const SITE_HOST = 'ai999999.top'
const SITEMAP_URL = 'https://ai999999.top/sitemap.xml'

// 加载 .env（tsx 不自动加载）
try {
  const envPath = resolve(process.cwd(), '.env')
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) {
      const k = t.slice(0, i).trim()
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[k]) process.env[k] = v
    }
  }
} catch {}

const API_KEY = process.env.INDEXNOW_KEY
if (!API_KEY) {
  console.error('❌ 缺少环境变量 INDEXNOW_KEY（请在 .env 中配置，值即 public/<key>.txt 的文件名）')
  process.exit(1)
}
const KEY_LOCATION = `https://${SITE_HOST}/${API_KEY}.txt`

// 每批提交数量（Bing 推荐流式模式，每批不超过 5 条）
const BATCH_SIZE = 5
// 批次间隔（毫秒，Bing 建议流式推送降低服务器压力）
const BATCH_DELAY = 1000
// 失败重试次数
const MAX_RETRIES = 3
// fetch 超时（毫秒）
const FETCH_TIMEOUT = 15000

interface IndexNowPayload {
  host: string
  key: string
  keyLocation: string
  urlList: string[]
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * fetch 带超时
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 从 sitemap.xml 中解析所有 URL
 */
async function fetchSitemapUrls(): Promise<string[]> {
  console.log(`📡 读取 sitemap: ${SITEMAP_URL}`)

  const res = await fetchWithTimeout(SITEMAP_URL)
  if (!res.ok) {
    throw new Error(`获取 sitemap 失败: ${res.status} ${res.statusText}`)
  }

  const xml = await res.text()
  const urls: string[] = []

  // 简单 XML 解析：提取 <loc> 标签内容
  const locRegex = /<loc>([^<]+)<\/loc>/gi
  let match
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].trim())
  }

  console.log(`✅ 从 sitemap 解析到 ${urls.length} 条 URL`)
  return urls
}

/**
 * 提交一批 URL 到 IndexNow API（带重试）
 */
async function submitBatch(urls: string[], retryCount = 0): Promise<boolean> {
  const payload: IndexNowPayload = {
    host: SITE_HOST,
    key: API_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  }

  try {
    const res = await fetchWithTimeout(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.status === 200) {
      console.log(`  ✅ 提交 ${urls.length} 条成功`)
      return true
    } else if (res.status === 202) {
      console.log(`  ✅ 提交 ${urls.length} 条已接受 (202)`)
      return true
    } else {
      const body = await res.text().catch(() => '')
      console.error(`  ❌ 提交失败: HTTP ${res.status} ${body}`)
      // 非 429/5xx 不重试
      if (res.status !== 429 && res.status < 500) return false
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      const wait = Math.min(1000 * Math.pow(2, retryCount), 10000)
      console.log(`  🔄 重试 ${retryCount + 1}/${MAX_RETRIES}（等待 ${wait}ms）...`)
      await sleep(wait)
      return submitBatch(urls, retryCount + 1)
    }
    console.error(`  ❌ 重试耗尽:`, err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * 流式推送所有 URL
 */
async function submitAllStreaming(urls: string[]): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0
  const total = urls.length
  const totalBatches = Math.ceil(total / BATCH_SIZE)

  console.log(`🚀 开始流式推送 ${total} 条 URL（每批 ${BATCH_SIZE} 条，间隔 ${BATCH_DELAY}ms，共 ${totalBatches} 批）`)
  console.log('')

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    // 只显示批次号，减少日志量
    if (totalBatches <= 100 || batchNum % 5 === 1 || batchNum === totalBatches) {
      process.stdout.write(`  [${batchNum}/${totalBatches}] `)
    }

    const ok = await submitBatch(batch)

    if (ok) {
      success += batch.length
      if (totalBatches <= 100 || batchNum % 5 === 1 || batchNum === totalBatches) {
        console.log(`  ✅`)
      }
    } else {
      failed += batch.length
      console.log(`  ❌`)
    }

    if (i + BATCH_SIZE < total) {
      await sleep(BATCH_DELAY)
    }
  }

  return { success, failed }
}

/**
 * 推送单条 URL
 */
async function submitSingle(url: string): Promise<boolean> {
  console.log(`📤 推送单条 URL: ${url}`)
  return await submitBatch([url])
}

/**
 * 主入口
 */
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  IndexNow 流式推送工具')
  console.log(`  站点: ${SITE_HOST}`)
  console.log(`  密钥: ${API_KEY}.txt`)
  console.log('═══════════════════════════════════════════')
  console.log('')

  // 检查命令行参数
  const args = process.argv.slice(2)
  const urlIndex = args.indexOf('--url')
  const limitIndex = args.indexOf('--limit')

  // --limit 参数：限制推送条数
  let limit: number | undefined
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10)
    if (isNaN(limit) || limit <= 0) {
      console.error('❌ --limit 必须是正整数')
      process.exit(1)
    }
    console.log(`📐 限制推送前 ${limit} 条`)
    console.log('')
  }

  if (urlIndex !== -1 && args[urlIndex + 1]) {
    // 单条推送
    const url = args[urlIndex + 1]
    const ok = await submitSingle(url)
    console.log(ok ? '✅ 推送完成' : '❌ 推送失败')
    process.exit(ok ? 0 : 1)
  } else {
    // 全量推送
    const urls = await fetchSitemapUrls()

    if (urls.length === 0) {
      console.warn('⚠️ 没有找到任何 URL')
      process.exit(0)
    }

    const finalUrls = limit ? urls.slice(0, limit) : urls
    if (limit && limit < urls.length) {
      console.log(`📐 已从 ${urls.length} 条中截取前 ${limit} 条`)
      console.log('')
    }

    const { success, failed } = await submitAllStreaming(finalUrls)

    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log(`  ✅ 成功: ${success}`)
    if (failed > 0) {
      console.log(`  ❌ 失败: ${failed}`)
    }
    console.log(`  📊 总计: ${success + failed}`)
    console.log('═══════════════════════════════════════════')

    process.exit(failed > 0 ? 1 : 0)
  }
}

main().catch(err => {
  console.error('❌ 脚本异常:', err)
  process.exit(1)
})
