/**
 * 为已有GitHub链接但stars=0的工具补上真实star数
 * 用法: npx tsx scripts/backfill-stars.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db-retry'
import { getGitHubStars } from '@/lib/github-stars'

// 加载 .env（tsx 不会自动加载；作为子进程运行时也会继承父进程变量）
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
} catch {
  // .env 不存在时使用系统环境变量
}

async function main() {
  console.log('📦 查询需要补 star 的工具...')

  const tools = await withDbRetry(
    () =>
      prisma.tool.findMany({
        where: {
          githubUrl: { not: null },
          stars: 0,
        },
        select: { id: true, name: true, githubUrl: true },
      }),
    5,
    '查询待补 star 工具'
  )

  console.log(`📊 共 ${tools.length} 个工具需要补 star\n`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < tools.length; i++) {
    const t = tools[i]
    process.stdout.write(`  [${i + 1}/${tools.length}] ${t.name}... `)

    const stars = await getGitHubStars(t.githubUrl)
    if (stars > 0) {
      await withDbRetry(
        () => prisma.tool.update({ where: { id: t.id }, data: { stars } }),
        5,
        `更新 ${t.name}`
      )
      console.log(`⭐ ${stars}`)
      updated++
    } else {
      console.log(`-`)
      failed++
    }

    // GitHub API 限速，慢一点
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\n✨ 完成! 更新: ${updated}, 无数据: ${failed}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
