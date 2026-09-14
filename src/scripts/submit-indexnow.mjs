/**
 * IndexNow 推送脚本（纯 Node.js 18+，无外部依赖）
 *
 * 用法：
 *   node src/scripts/submit-indexnow.mjs                  # 全量推送
 *   node src/scripts/submit-indexnow.mjs --limit 200      # 只推前 200 条
 *   node src/scripts/submit-indexnow.mjs --url "..."      # 单条推送
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const INDEXNOW_API = 'https://api.indexnow.org/indexnow'
const SITE_HOST = 'ai999999.top'
const SITEMAP_URL = 'https://ai999999.top/sitemap.xml'

// 加载 .env（node 不自动加载）
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

const BATCH_SIZE = 50
const BATCH_DELAY = 100
const MAX_RETRIES = 3
const FETCH_TIMEOUT = 15000

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchSitemapUrls() {
  console.log(`📡 读取 sitemap: ${SITEMAP_URL}`)
  const res = await fetchWithTimeout(SITEMAP_URL)
  if (!res.ok) throw new Error(`获取 sitemap 失败: ${res.status} ${res.statusText}`)
  const xml = await res.text()
  const urls = []
  const locRegex = /<loc>([^<]+)<\/loc>/gi
  let match
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].trim())
  }
  console.log(`✅ 从 sitemap 解析到 ${urls.length} 条 URL`)
  return urls
}

async function submitBatch(urls, retryCount = 0) {
  const payload = { host: SITE_HOST, key: API_KEY, keyLocation: KEY_LOCATION, urlList: urls }

  try {
    const res = await fetchWithTimeout(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.status === 200 || res.status === 202) {
      return true
    } else {
      const body = await res.text().catch(() => '')
      console.error(`  ❌ HTTP ${res.status} ${body.slice(0, 100)}`)
      if (res.status !== 429 && res.status < 500) return false
      throw new Error(`HTTP ${res.status}`)
    }
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      const wait = Math.min(1000 * 2 ** retryCount, 10000)
      console.log(`  🔄 重试 ${retryCount + 1}/${MAX_RETRIES} (${wait}ms)...`)
      await sleep(wait)
      return submitBatch(urls, retryCount + 1)
    }
    console.error(`  ❌ 重试耗尽: ${err.message || err}`)
    return false
  }
}

async function submitAllStreaming(urls) {
  let success = 0, failed = 0
  const total = urls.length
  const totalBatches = Math.ceil(total / BATCH_SIZE)
  console.log(`🚀 开始推送 ${total} 条 (每批 ${BATCH_SIZE} 条, ${BATCH_DELAY}ms 间隔, 共 ${totalBatches} 批)\n`)

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const ok = await submitBatch(batch)

    if (ok) {
      success += batch.length
      process.stdout.write(`  [${batchNum}/${totalBatches}] ✅ ${batch.length} 条\n`)
    } else {
      failed += batch.length
      process.stdout.write(`  [${batchNum}/${totalBatches}] ❌\n`)
    }

    if (i + BATCH_SIZE < total) await sleep(BATCH_DELAY)
  }
  return { success, failed }
}

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('  IndexNow 推送工具')
  console.log(`  站点: ${SITE_HOST}`)
  console.log('══════════════════════════════════════════\n')

  const args = process.argv.slice(2)
  const urlIdx = args.indexOf('--url')
  const limitIdx = args.indexOf('--limit')

  let limit
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10)
    if (isNaN(limit) || limit <= 0) {
      console.error('❌ --limit 必须是正整数')
      process.exit(1)
    }
  }

  if (urlIdx !== -1 && args[urlIdx + 1]) {
    const ok = await submitBatch([args[urlIdx + 1]])
    console.log(ok ? '✅ 推送完成' : '❌ 推送失败')
    process.exit(ok ? 0 : 1)
  }

  const urls = await fetchSitemapUrls()
  if (urls.length === 0) { console.warn('⚠️ 无 URL'); process.exit(0) }

  const finalUrls = limit ? urls.slice(0, limit) : urls
  if (limit && limit < urls.length) console.log(`📐 截取前 ${limit} 条\n`)

  const { success, failed } = await submitAllStreaming(finalUrls)
  console.log(`\n✅ 成功: ${success}  ❌ 失败: ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => { console.error('❌ 异常:', err); process.exit(1) })
