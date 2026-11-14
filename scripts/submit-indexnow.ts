/**
 * IndexNow 提交脚本（本地生成URL，无需从线上拉sitemap）
 * 避免 Cloudflare 拦截问题
 * 用法: npx tsx scripts/submit-indexnow.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Client } from 'pg'

// 加载 .env（tsx 不自动加载；作为子进程运行时也会继承父进程变量）
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

const SITE_HOST = 'ai999999.top'
const API_KEY = process.env.INDEXNOW_KEY
if (!API_KEY) {
  // 缺密钥属「未启用」而非「出错」：exit 1 只会在 CI 里制造红叉，
  // 与 workflow 的 continue-on-error（无密钥不阻塞）意图不符
  console.warn('⚠️ 未配置 INDEXNOW_KEY，跳过 IndexNow 提交')
  console.warn('   在 .env 或 GitHub Secrets 中配置后自动生效，值即 public/<key>.txt 的文件名')
  process.exit(0)
}
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
  // 用 pg 直连而非 Prisma：Prisma Rust 引擎在本机建连需 11~17s，作为爬虫子进程运行时
  // 叠加父进程占用的连接，极易撞 pool_timeout(30s) 报 P2024；本脚本只需一列 slug，
  // pg 建连约 3s，且不启动 Prisma 引擎，稳定性远好于走连接池
  let tools: Array<{ slug: string }> = []
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 45000,
  })
  try {
    await client.connect()
    const res = await client.query(
      `SELECT slug FROM tools WHERE status = 'approved' AND "isActive" = true LIMIT $1::int`,
      [MAX_URLS - urls.length]
    )
    tools = res.rows
  } finally {
    await client.end().catch(() => {})
  }
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
