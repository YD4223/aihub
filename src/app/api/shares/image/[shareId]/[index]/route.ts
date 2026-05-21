import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getImageCacheKey, getCachedImage, setCachedImage } from '@/lib/image-cache'

// 用原生 Response 替代 NextResponse，避免 Next.js 14 类型定义太死的问题
function imageResponse(buffer: Buffer, mimeType: string, isHit: boolean): Response {
  return new Response(buffer, {
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
// 从数据库读取分享图片的 base64 数据，返回 HTTP 图片响应
// 避免将大图 base64 直接嵌入 HTML（首页 3.4MB HTML 的问题根源）
export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string; index: string } }
) {
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

    // 2. 只查 images 字段，减少数据传输
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

    const imageData = images[index]
    if (!imageData || typeof imageData !== 'string') {
      return new Response('Invalid image data', { status: 500 })
    }

    // 4. 解析 data URI 格式: "data:image/webp;base64,...."
    const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) {
      return new Response('Invalid image format', { status: 500 })
    }

    const mimeType = `image/${match[1]}`
    const base64Data = match[2]

    // 5. 解码 base64 为 Buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // 6. 写入内存缓存
    setCachedImage(cacheKey, buffer, mimeType)

    // 7. 返回图片响应，带强缓存头
    // 浏览器缓存 1 天，CDN 缓存 7 天，过期后 30 天内允许 stale
    return imageResponse(buffer, mimeType, false)
  } catch (error) {
    console.error('图片代理错误:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
