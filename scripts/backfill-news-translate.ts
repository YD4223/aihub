/**
 * 补翻存量资讯：把 titleZh / summaryZh 为空的英文资讯补齐中文翻译
 *
 * 用法：
 *   npx tsx scripts/backfill-news-translate.ts             # 处理全部
 *   npx tsx scripts/backfill-news-translate.ts --limit 20  # 只处理 N 条
 *
 * 依赖 @/lib/translate 的多级 fallback（腾讯 → Ollama → MyMemory）。
 * 某条翻译失败不会中断，继续下一条；连续失败 5 次自动停止（避免无谓等待）。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { prisma } from '@/lib/prisma'
import { translateToChinese } from '@/lib/translate'

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

const hasChinese = (s: string | null | undefined) => !!s && /[\u4e00-\u9fff]/.test(s)

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1] || '0', 10) : 0

  const all = await prisma.news.findMany({
    where: {
      OR: [{ titleZh: null }, { titleZh: '' }, { summaryZh: null }, { summaryZh: '' }],
    },
    select: { id: true, title: true, summary: true, titleZh: true, summaryZh: true },
    orderBy: { createdAt: 'desc' },
  })

  // 仅处理英文（标题无中文）
  const targets = all.filter((n) => !hasChinese(n.title))
  const queue = limit > 0 ? targets.slice(0, limit) : targets

  console.log(`📦 待补翻：${queue.length} 条（无翻译总数 ${all.length}，其中英文 ${targets.length}）\n`)
  if (queue.length === 0) {
    console.log('✅ 没有需要补翻的资讯')
    await prisma.$disconnect()
    return
  }

  let updated = 0
  let failed = 0
  let consecutiveFail = 0

  for (let i = 0; i < queue.length; i++) {
    const n = queue[i]
    process.stdout.write(`  [${i + 1}/${queue.length}] ${n.title.slice(0, 45)}... `)

    const titleZh = n.titleZh && hasChinese(n.titleZh) ? n.titleZh : await translateToChinese(n.title)
    const summaryZh =
      n.summaryZh && hasChinese(n.summaryZh)
        ? n.summaryZh
        : n.summary
          ? await translateToChinese(n.summary)
          : ''

    if (!titleZh && !summaryZh) {
      console.log('❌ 全部通道失败')
      failed++
      consecutiveFail++
      if (consecutiveFail >= 5) {
        console.log('\n⚠️ 连续 5 条翻译失败，提前停止（检查腾讯额度 / 是否启动 Ollama）')
        break
      }
      continue
    }

    consecutiveFail = 0
    await prisma.news.update({
      where: { id: n.id },
      data: {
        ...(titleZh ? { titleZh } : {}),
        ...(summaryZh ? { summaryZh } : {}),
      },
    })
    updated++
    console.log(`✅ ${titleZh.slice(0, 30)}`)
  }

  console.log(`\n✨ 完成！更新 ${updated} 条，失败 ${failed} 条`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌', e)
  await prisma.$disconnect()
  process.exit(1)
})
