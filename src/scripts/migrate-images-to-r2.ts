/**
 * 迁移数据库中已有的 base64 图片到 R2
 * 运行: npx tsx src/scripts/migrate-images-to-r2.ts
 * 
 * 流程:
 * 1. 查询所有包含 base64 图片的 shares 记录
 * 2. 解析 JSON images 字段
 * 3. 将 base64 上传到 R2，替换为 R2 URL
 * 4. 更新数据库
 */
import { prisma } from '@/lib/prisma'
import { uploadImage, parseBase64Image, isR2Configured } from '@/lib/r2'

async function migrateImages() {
  if (!isR2Configured()) {
    console.log('❌ R2 未配置，跳过迁移')
    process.exit(1)
  }

  console.log('📦 R2 已配置，开始扫描 base64 图片...\n')

  // 查询所有有图片的分享记录
  const shares = await prisma.$queryRawUnsafe<Array<any>>(`
    SELECT id, images FROM shares 
    WHERE images IS NOT NULL AND images LIKE '["%data:image/%'
  `)

  console.log(`找到 ${shares.length} 条包含 base64 图片的分享\n`)

  let migrated = 0
  let skipped = 0

  for (const share of shares) {
    try {
      const images: string[] = JSON.parse(share.images)
      if (!Array.isArray(images) || images.length === 0) {
        skipped++
        continue
      }

      const uploadedUrls: string[] = []
      let hasChange = false

      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (typeof img === 'string' && img.startsWith('data:image/')) {
          const parsed = parseBase64Image(img)
          if (parsed) {
            const key = `shares/migrate/${share.id}-${i}.${parsed.mimeType.split('/')[1]}`
            const url = await uploadImage(key, parsed.buffer, parsed.mimeType)
            uploadedUrls.push(url)
            hasChange = true
            console.log(`  ✅ 分享 #${share.id} 图片 ${i} → R2`)
          } else {
            uploadedUrls.push(img)
          }
        } else {
          uploadedUrls.push(img)
        }
      }

      if (hasChange) {
        await prisma.$executeRawUnsafe(
          `UPDATE shares SET images = $1 WHERE id = $2`,
          JSON.stringify(uploadedUrls),
          share.id
        )
        migrated++
      } else {
        skipped++
      }
    } catch (e) {
      console.error(`  ❌ 分享 #${share.id} 失败:`, e)
    }
  }

  console.log(`\n📊 迁移完成:`)
  console.log(`   已迁移: ${migrated} 条`)
  console.log(`   跳过: ${skipped} 条`)
  console.log(`   总计: ${shares.length} 条`)
}

migrateImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
