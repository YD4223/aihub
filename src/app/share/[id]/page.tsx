import Link from 'next/link'
import { ArrowLeft, Heart, MessageCircle, Eye, Clock } from 'lucide-react'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'
import { getShareImages } from '@/lib/share-image'
import ShareDetailClient from './ShareDetailClient'
import type { Metadata } from 'next'

export const revalidate = 600

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const share = await prisma.share.findUnique({
    where: { id: parseInt(params.id) },
    select: { content: true },
  })
  return {
    title: share ? `分享详情 | AI Hub` : '分享不存在 | AI Hub',
  }
}

export default async function ShareDetailPage({ params }: Props) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const share = await prisma.share.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true, role: true } },
      tool: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!share || share.status !== 'approved') notFound()

  const shareImages = getShareImages(share.id, share.images)

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* 返回按钮 */}
        <Link
          href="/user-share"
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-mono text-cyber-muted-foreground hover:text-neon-green border border-cyber-border hover:border-neon-green clip-chamfer-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回社区
        </Link>

        {/* 分享内容卡片 */}
        <div className="bg-cyber-card border border-cyber-border clip-chamfer overflow-hidden">
          {/* 分享头部：用户信息 + 时间 */}
          <div className="p-4 sm:p-6 border-b border-cyber-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-bold font-mono text-sm">
                {share.user?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyber-foreground text-sm">
                    {share.user?.username || '匿名'}
                  </span>
                  {share.user?.role === 'ADMIN' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 clip-chamfer-sm">
                      站长
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-cyber-muted-foreground font-mono">
                  <Clock className="w-3 h-3" />
                  {new Date(share.createdAt).toLocaleDateString('zh-CN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
              {/* 关联工具标签 */}
              {share.tool && (
                <Link
                  href={`/tools/${share.tool.slug}`}
                  className="ml-auto px-3 py-1.5 text-xs font-mono bg-neon-green/10 text-neon-green border border-neon-green/30 clip-chamfer-sm hover:bg-neon-green/20 transition-colors"
                >
                  #{share.tool.name}
                </Link>
              )}
            </div>
          </div>

          {/* 分享内容 */}
          <div className="p-4 sm:p-6">
            <div className="text-sm sm:text-base text-cyber-foreground/90 font-mono leading-relaxed whitespace-pre-wrap">
              {share.content}
            </div>

            {/* 图片 */}
            {shareImages.length > 0 && (
              <div className={`grid gap-2 mt-4 ${
                shareImages.length === 1 ? 'grid-cols-1' :
                shareImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}>
                {shareImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-lg aspect-video bg-cyber-background border border-cyber-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 标签 */}
            {share.tags && (
              <div className="flex flex-wrap gap-2 mt-4">
                {share.tags.split(',').map((tag) => (
                  <Link
                    key={tag.trim()}
                    href={`/user-share?search=${encodeURIComponent(tag.trim())}`}
                    className="px-2 py-0.5 text-xs font-mono text-neon-cyan border border-neon-cyan/30 rounded hover:bg-neon-cyan/10 transition-colors"
                  >
                    #{tag.trim()}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="px-4 sm:px-6 py-3 border-t border-cyber-border flex items-center gap-6 text-sm text-cyber-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-neon-green" />
              {share.likes}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-neon-cyan" />
              评论
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {share.viewCount || 0}
            </span>
          </div>
        </div>

        {/* 评论区 */}
        <div className="mt-6">
          <ShareDetailClient shareId={share.id} shareType={share.type} />
        </div>
      </div>

      <Footer />
    </div>
  )
}
