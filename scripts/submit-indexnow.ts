/**
 * IndexNow 提交脚本（本地生成URL，无需从线上拉sitemap）
 * 避免 Cloudflare 拦截问题
 * 用法: npx tsx scripts/submit-indexnow.ts
 */
import { prisma } from '@/lib/prisma'

const SITE_HOST = 'ai999999.top'
const API_KEY = '25dae7e87ad508621408a0351647d05d19fa4c606d8266bfffa947146a16c4ac'
const PRIMARY_API = 'https://api.indexnow.org/indexnow'
const FALLBACK_API = 'https://www.bing.com/indexnow'
const BATCH_SIZE = 5
const MAX_URLS = 200

async function fetchWithRetry(url: string, payload: any, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) return true
      console.log(`   HTTP ${res.status}，重试 ${i + 1}/${retries}...`)
    } catch (e) {
      console.log(`   请求失败: ${e}，重试 ${i + 1}/${retries}...`)
    }
    await new Promise(r => setTimeout(r, 2000))
  }
  return false
}

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('  IndexNow 推送工具 (Node.js)')
  console.log(`  站点: ${SITE_HOST}`)
  console.log('══════════════════════════════════════════\n')

  // 生成本地 URL 列表
  console.log('📦 生成本地 URL 列表...')
  const baseUrl = `https://${SITE_HOST}`

  // 静态页面
  const urls: string[] = [
    baseUrl,
    `${baseUrl}/tools`,
    `${baseUrl}/news`,
    `${baseUrl}/trending`,
    `${baseUrl}/opensource`,
    `${baseUrl}/user-share`,
    `${baseUrl}/about`,
    `${baseUrl}/submit`,
    `${baseUrl}/login`,
  ]

  // 从数据库获取工具详情页
  const tools = await prisma.tool.findMany({
    where: { status: 'approved', isActive: true },
    select: { slug: true },
    take: MAX_URLS - urls.length,
  })
  for (const t of tools) {
    urls.push(`${baseUrl}/tools/${t.slug}`)
  }

  console.log(`✅ 生成了 ${urls.length} 条 URL（截取前 ${MAX_URLS} 条）\n`)

  // 分批提交
  let success = 0
  let failed = 0

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE)

    const payload = {
      host: SITE_HOST,
      key: API_KEY,
      keyLocation: `https://${SITE_HOST}/${API_KEY}.txt`,
      urlList: batch,
    }

    process.stdout.write(`  [${batchNum}/${totalBatches}] `)

    // 先试主端点
    let ok = await fetchWithRetry(PRIMARY_API, payload)
    if (!ok) {
      process.stdout.write('⚠️ 主端点失败，尝试备选... ')
      ok = await fetchWithRetry(FALLBACK_API, payload)
    }

    if (ok) {
      console.log(`✅ ${batch.length} 条`)
      success += batch.length
    } else {
      console.log(`❌ ${batch.length} 条（均失败）`)
      failed += batch.length
    }

    // 批次间隔
    await new Promise(r => setTimeout(r, 500))
  }

  await prisma.$disconnect()

  console.log('\n══════════════════════════════════════════')
  console.log(`  ✅ 成功: ${success}`)
  if (failed > 0) console.log(`  ❌ 失败: ${failed}`)
  console.log(`  📊 总计: ${success + failed}`)
  console.log('══════════════════════════════════════════')

  if (failed > 0) process.exit(1)
}

main().catch(e => {
  console.error('❌', e)
  process.exit(1)
})
