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
  // 用系统临时目录：.workbuddy/ 受 WorkBuddy 管理，临时文件会被清理导致 worker 读不到输入
  const os = await import('os')
  const path = await import('path')
  const inputFile = path.join(os.tmpdir(), `translate_input_${process.pid}.json`)
  const outputFile = path.join(os.tmpdir(), `translate_output_${process.pid}.json`)
  fs.writeFileSync(inputFile, JSON.stringify(uniqueTexts), 'utf-8')

  try {
    execSync(
      `"${PYTHON}" scripts/translate-worker.py "${inputFile}" "${outputFile}"`,
      { cwd: process.cwd(), encoding: 'utf-8', timeout: 600000, stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 }
    )
  } catch (err: any) {
    // 把 worker 的 stderr 透出来，否则只能看到一句"翻译失败"无从排查
    if (err?.stderr) console.error(String(err.stderr).trim())
    throw err
  }

  if (!fs.existsSync(outputFile)) {
    throw new Error(`翻译进程未产出结果文件: ${outputFile}`)
  }

  const output = fs.readFileSync(outputFile, 'utf-8')
  const translationMap: Record<string, string> = JSON.parse(output)

  // 三分法，避免把"产品名无需翻译"误报成"翻译通道全挂"：
  //   translated  —— 译出中文，写库
  //   unchanged   —— 译文==原文（产品名 / 已中文），跳过但不报警
  //   missing     —— worker 未返回（通道失败）
  const isChinese = (s: string) => /[\u4e00-\u9fff]/.test(s)
  const translated = uniqueTexts.filter(
    (t) => translationMap[t] && translationMap[t] !== t && isChinese(translationMap[t])
  )
  const unchanged = uniqueTexts.filter((t) => translationMap[t] === t)
  const missing = uniqueTexts.filter((t) => !translationMap[t])

  console.log(`✅ 译出中文: ${translated.length}`)
  console.log(`➖ 无需翻译(产品名/已中文): ${unchanged.length}`)
  console.log(`⚠️  未返回: ${missing.length}`)

  // 只有"有内容未返回"且"一条都没译出"才算通道故障
  if (translated.length === 0 && missing.length > 0) {
    console.warn('\n⚠️ 有文本未返回且无任何译文——翻译通道可能不可用')
    console.warn('   检查：腾讯 TMT 免费额度 / 本地 Ollama 是否启动 / MyMemory 额度')
    console.warn('   本次不写库，避免把原文当译文覆盖。')
    try { fs.unlinkSync(inputFile); fs.unlinkSync(outputFile) } catch {}
    await prisma.$disconnect()
    return
  }

  if (translated.length === 0) {
    console.log('\n✅ 本次无需翻译（全部为产品名或已中文内容）')
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
