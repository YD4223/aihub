/**
 * 批量翻译工具简介：英文 → 中文
 * 使用腾讯云翻译 API（免费额度内，不花钱）
 * 用法: npx tsx scripts/batch-translate.ts
 */
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db-retry'
import { execSync } from 'child_process'

const PYTHON = 'C:\\Users\\Lenovo\\.workbuddy\\binaries\\python\\versions\\3.13.12\\python.exe'

async function main() {
  console.log('📦 查询需要翻译的工具...')

  // 找出 shortDesc 或 description 不含中文的（已翻译过的跳过）
  // 加 DB 重试：作为 crawl 子进程运行时，主进程仍持有连接，偶发 P1001/P2024
  const tools = await withDbRetry(
    () =>
      prisma.tool.findMany({
        where: {
          OR: [
            { shortDesc: { not: null } },
            { description: { not: null } },
          ]
        },
        select: { id: true, name: true, shortDesc: true, description: true },
        orderBy: { stars: 'desc' },
      }),
    5,
    '查询工具列表'
  )

  // 筛选出需要翻译的
  const hasChinese = (s: string | null) => {
    if (!s) return false
    return /[\u4e00-\u9fff]/.test(s)
  }

  const toTranslate: { id: number; name: string; shortDesc?: string; description?: string }[] = []
  for (const t of tools) {
    const needsShort = t.shortDesc && !hasChinese(t.shortDesc)
    const needsDesc = t.description && !hasChinese(t.description)
    if (needsShort || needsDesc) {
      toTranslate.push({
        id: t.id,
        name: t.name,
        ...(needsShort ? { shortDesc: t.shortDesc! } : {}),
        ...(needsDesc ? { description: t.description! } : {}),
      })
    }
  }

  console.log(`📊 共 ${toTranslate.length} 个工具需要翻译\n`)
  if (toTranslate.length === 0) {
    console.log('✅ 没有需要翻译的工具')
    await prisma.$disconnect()
    return
  }

  // 收集所有需要翻译的文本（去重）
  const textSet = new Set<string>()
  for (const t of toTranslate) {
    if (t.shortDesc) textSet.add(t.shortDesc)
    if (t.description) textSet.add(t.description)
  }
  const uniqueTexts = Array.from(textSet)
  console.log(`🔄 ${uniqueTexts.length} 段不重复文本需要翻译`)

  // 用 Python 批量翻译
  console.log('🚀 启动翻译进程（这需要一些时间）...')
  const fs = await import('fs')
  const inputFile = '.workbuddy/translate_input.json'
  const outputFile = '.workbuddy/translate_output.json'
  fs.writeFileSync(inputFile, JSON.stringify(uniqueTexts), 'utf-8')

  execSync(
    `"${PYTHON}" scripts/translate-worker.py "${inputFile}" "${outputFile}"`,
    { cwd: process.cwd(), encoding: 'utf-8', timeout: 600000, stdio: 'pipe' }
  )

  const output = fs.readFileSync(outputFile, 'utf-8')
  const translationMap: Record<string, string> = JSON.parse(output)

  // 真实成功 = 译出中文且与原文不同（全部通道失效时会回退成原文，不能只看 key 数量）
  const reallyTranslated = uniqueTexts.filter(
    (t) => translationMap[t] && translationMap[t] !== t && /[\u4e00-\u9fff]/.test(translationMap[t])
  ).length
  console.log(`✅ 翻译成功: ${reallyTranslated}`)
  console.log(`⚠️  未翻译: ${uniqueTexts.length - reallyTranslated}`)

  if (reallyTranslated === 0) {
    console.warn('\n⚠️ 所有文本都未译出中文——翻译通道可能全部不可用')
    console.warn('   检查：腾讯 TMT 免费额度 / 本地 Ollama 是否启动 / MyMemory 额度')
    console.warn('   本次不写库，避免把原文当译文覆盖。')
    try { fs.unlinkSync(inputFile); fs.unlinkSync(outputFile) } catch {}
    await prisma.$disconnect()
    return
  }

  // 更新数据库
  let updated = 0
  for (const t of toTranslate) {
    const updates: any = {}
    if (t.shortDesc && translationMap[t.shortDesc] &&
        translationMap[t.shortDesc] !== t.shortDesc &&
        /[\u4e00-\u9fff]/.test(translationMap[t.shortDesc])) {
      updates.shortDesc = translationMap[t.shortDesc]
    }
    if (t.description && translationMap[t.description] &&
        translationMap[t.description] !== t.description &&
        /[\u4e00-\u9fff]/.test(translationMap[t.description])) {
      updates.description = translationMap[t.description]
    }
    if (Object.keys(updates).length > 0) {
      await withDbRetry(
        () => prisma.tool.update({ where: { id: t.id }, data: updates }),
        5,
        `更新工具 ${t.id}`
      )
      updated++
    }
  }

  // 清理临时文件（失败不影响已完成的翻译）
  try {
    fs.unlinkSync(inputFile)
    fs.unlinkSync(outputFile)
  } catch (e) {
    console.warn('⚠️ 临时文件清理失败（不影响翻译结果）:', e instanceof Error ? e.message : e)
  }

  console.log(`\n✨ 完成! 更新了 ${updated} 个工具的简介`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error('❌ 错误:', e)
  process.exit(1)
})
