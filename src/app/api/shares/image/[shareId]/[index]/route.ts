import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getImageCacheKey, getCachedImage, setCachedImage } from '@/lib/image-cache'
import { isR2Image } from '@/lib/r2'

// 将 Buffer 转为标准 Uint8Array
function imageResponse(buffer: Buffer, mimeType: string, isHit: boolean): Response {
  return new Response(new Blob([Uint8Array.from(buffer)]), {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      'Vary': 'Accept-Encoding',
      'X-Image-Size': `${(buffer.length / 1024).toFixed(0)}KB`,
      'X-Cache': isHit ? 'HIT' : 'MISS',
    },
  })
}

// GET /api/shares/image/{shareId}/{index}
// 从数据库读取分享图片，返回 HTTP 图片响应
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ shareId: string; index: string }> }
) {
  const params = await props.params;
  try {
    const shareId = parseInt(params.shareId)
    const index = parseInt(params.index)

    if (isNaN(shareId) || isNaN(index) || index < 0) {
      return new Response('Invalid parameters', { status: 400 })
    }

    // 1. 查内存缓存
    const cacheKey = getImageCacheKey(shareId, index)
    const cached = getCachedImage(cacheKey)
    if (cached) {
      return imageResponse(cached.buffer, cached.mimeType, true)
    }

    // 2. 只查 images 字段
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: { images: true },
    })

    if (!share?.images) {
      return new Response('Not found', { status: 404 })
    }

    // 3. 解析 JSON 数组
    let images: string[]
    try {
      images = JSON.parse(share.images)
    } catch {
      return new Response('Invalid images data', { status: 500 })
    }

    if (!Array.isArray(images) || index >= images.length) {
      return new Response('Image not found', { status: 404 })
    }

    const imageEntry = images[index]
    if (!imageEntry || typeof imageEntry !== 'string') {
      return new Response('Invalid image data', { status: 500 })
    }

    // 4. 如果已经是 R2 URL，302 重定向到 R2
    if (isR2Image(imageEntry)) {
      return Response.redirect(imageEntry, 302)
    }

    // 5. 兼容旧版 base64 data URI 格式
    const match = imageEntry.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) {
      return new Response('Invalid image format', { status: 500 })
    }

    const mimeType = `image/${match[1]}`
    const base64Data = match[2]

    // 6. 解码 base64 为 Buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // 7. 写入内存缓存
    setCachedImage(cacheKey, buffer, mimeType)

    // 8. 返回图片响应
    return imageResponse(buffer, mimeType, false)
  } catch (error) {
    console.error('图片代理错误:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
