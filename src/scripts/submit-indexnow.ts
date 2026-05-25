/**
 * IndexNow 流式推送脚本（Streaming Mode）
 * 
 * 功能：
 * 1. 读取站点 sitemap.xml
 * 2. 解析所有 URL
 * 3. 分批流式推送至 IndexNow API（每批 5 条，间隔 500ms）
 * 
 * Bing 建议 Streaming 模式：逐条或小批量提交，避免服务器过载和被拒（410）
 * 
 * 用法：
 *   npm run indexnow           # 推送 sitemap 中所有 URL
 *   npm run indexnow -- --url "https://ai999999.top/tools/xxx"   # 推送单条 URL
 */

const INDEXNOW_API = 'https://api.indexnow.org/indexnow'
const SITE_HOST = 'ai999999.top'
const SITEMAP_URL = 'https://ai999999.top/sitemap.xml'
const API_KEY = '25dae7e87ad508621408a0351647d05d19fa4c606d8266bfffa947146a16c4ac'
const KEY_LOCATION = `https://${SITE_HOST}/${API_KEY}.txt`

// 每批提交数量（Bing 推荐的 streaming 上限）
const BATCH_SIZE = 5
// 批次间隔（毫秒）
const BATCH_DELAY = 500

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
 * 从 sitemap.xml 中解析所有 URL
 */
async function fetchSitemapUrls(): Promise<string[]> {
  console.log(`📡 读取 sitemap: ${SITEMAP_URL}`)

  const res = await fetch(SITEMAP_URL)
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
 * 提交一批 URL 到 IndexNow API
 */
async function submitBatch(urls: string[]): Promise<boolean> {
  const payload: IndexNowPayload = {
    host: SITE_HOST,
    key: API_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  }

  try {
    const res = await fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.status === 200) {
      console.log(`  ✅ 提交 ${urls.length} 条成功`)
      return true
    } else if (res.status === 202) {
      // 202 Accepted 也是成功
      console.log(`  ✅ 提交 ${urls.length} 条已接受 (202)`)
      return true
    } else {
      const body = await res.text().catch(() => '')
      console.error(`  ❌ 提交失败: HTTP ${res.status} ${body}`)
      return false
    }
  } catch (err) {
    console.error(`  ❌ 网络错误:`, err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * 流式推送所有 URL
 */
async function submitAllStreaming(urls: string[]): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  console.log(`🚀 开始流式推送 ${urls.length} 条 URL（每批 ${BATCH_SIZE} 条，间隔 ${BATCH_DELAY}ms）`)
  console.log('')

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE)

    process.stdout.write(`  [${batchNum}/${totalBatches}] `)
    const ok = await submitBatch(batch)

    if (ok) {
      success += batch.length
    } else {
      failed += batch.length
    }

    // 除了最后一批，其他都等一下再发
    if (i + BATCH_SIZE < urls.length) {
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

    const { success, failed } = await submitAllStreaming(urls)

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
