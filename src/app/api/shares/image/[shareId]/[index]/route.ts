import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      return new NextResponse('Invalid parameters', { status: 400 })
    }

    // 只查 images 字段，减少数据传输
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: { images: true },
    })

    if (!share?.images) {
      return new NextResponse('Not found', { status: 404 })
    }

    // 解析 JSON 数组
    let images: string[]
    try {
      images = JSON.parse(share.images)
    } catch {
      return new NextResponse('Invalid images data', { status: 500 })
    }

    if (!Array.isArray(images) || index >= images.length) {
      return new NextResponse('Image not found', { status: 404 })
    }

    const imageData = images[index]
    if (!imageData || typeof imageData !== 'string') {
      return new NextResponse('Invalid image data', { status: 500 })
    }

    // 解析 data URI 格式: "data:image/webp;base64,...."
    const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) {
      return new NextResponse('Invalid image format', { status: 500 })
    }

    const mimeType = `image/${match[1]}`
    const base64Data = match[2]

    // 解码 base64 为 Buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // 返回图片响应，带缓存头（CDN 可缓存 1 小时，浏览器缓存 10 分钟）
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
        'Vary': 'Accept-Encoding',
        'X-Image-Size': `${(buffer.length / 1024).toFixed(0)}KB`,
      },
    })
  } catch (error) {
    console.error('图片代理错误:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
