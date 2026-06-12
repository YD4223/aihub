import Link from 'next/link'
import { Rss, Radio, Zap, Globe, Code2, Smartphone, BookOpen, ChevronRight, ExternalLink } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'

export const revalidate = 7200

export const metadata = {
  title: 'RSS 订阅 | AI Hub',
  description: '订阅 AI Hub 的 RSS 资讯源，第一时间获取最新AI工具收录、行业资讯更新，涵盖大语言模型、AI绘画、代码助手、视频生成等领域动态。',
}

function GlitchHeading({ text, className = '' }: { text: string; className?: string }) {
  return (
    <h1
      className={`relative font-orbitron font-black uppercase tracking-wider ${className}`}
      data-text={text}
    >
      <span className="relative z-10">{text}</span>
      <span
        className="absolute top-0 left-0 -z-10 text-neon-magenta opacity-70"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)', transform: 'translateX(-2px)' }}
      >
        {text}
      </span>
      <span
        className="absolute top-0 left-0 -z-10 text-neon-cyan opacity-70"
        style={{ clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)', transform: 'translateX(2px)' }}
      >
        {text}
      </span>
    </h1>
  )
}

function ReaderCard({ name, desc, platform, href, color }: {
  name: string; desc: string; platform: string; href: string; color: 'cyan' | 'green' | 'magenta' | 'yellow'
}) {
  const colorMap = {
    cyan: 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan/5',
    green: 'border-neon-green text-neon-green hover:bg-neon-green/5',
    magenta: 'border-neon-magenta text-neon-magenta hover:bg-neon-magenta/5',
    yellow: 'border-neon-yellow text-neon-yellow hover:bg-neon-yellow/5',
  }
  const cornerColor = {
    cyan: 'border-neon-cyan',
    green: 'border-neon-green',
    magenta: 'border-neon-magenta',
    yellow: 'border-neon-yellow',
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`relative block p-5 border clip-chamfer bg-cyber-card/40 group transition-colors duration-200 ${colorMap[color]}`}
    >
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${cornerColor[color]}`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${cornerColor[color]}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-orbitron font-bold text-sm text-cyber-foreground group-hover:text-current transition-colors uppercase tracking-wide mb-1">{name}</div>
          <div className="text-xs text-cyber-muted-foreground font-mono mb-2">{desc}</div>
          <div className={`inline-block text-xs px-2 py-0.5 border clip-chamfer ${colorMap[color]} border-current/30 bg-current/5`}>{platform}</div>
        </div>
        <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>
    </a>
  )
}

export default async function RssPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai999999.top'
  const rssUrl = `${siteUrl}/api/rss.xml`

  // 获取最新5条资讯作为预览
  const recentNews = await prisma.news.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 5,
    select: { title: true, slug: true, publishedAt: true, sourceName: true },
  })

  // 获取最新5个工具
  const recentTools = await prisma.tool.findMany({
    where: { status: 'approved', isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { name: true, slug: true, pricingType: true, createdAt: true },
  })

  return (
    <div className="min-h-screen bg-cyber-background text-cyber-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-60" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-neon-green/40 clip-chamfer bg-neon-green/5 mb-8">
            <Rss className="w-3 h-3 text-neon-green animate-pulse" />
            <span className="text-xs font-orbitron text-neon-green tracking-widest uppercase">RSS FEED</span>
          </div>

          <GlitchHeading text="RSS 订阅" className="text-4xl md:text-5xl text-cyber-foreground mb-6" />

          <p className="text-lg text-cyber-muted-foreground font-mono leading-relaxed max-w-xl mx-auto">
            订阅 AI Hub，第一时间收到最新 AI 工具上线通知和 AI 资讯更新。
          </p>
        </div>
      </section>

      {/* RSS URL Box */}
      <section className="py-6 border-t border-cyber-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-6 border border-neon-green/50 clip-chamfer bg-cyber-card/40">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-green" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-green" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-green" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-green" />

            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-neon-green animate-pulse" />
              <span className="text-xs font-orbitron text-neon-green uppercase tracking-widest">Feed URL</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-cyber-background/80 border border-cyber-border px-4 py-2.5 clip-chamfer">
                <code className="font-mono text-sm text-neon-cyan break-all">{rssUrl}</code>
              </div>
              <a
                href={rssUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 border border-neon-green clip-chamfer text-neon-green font-orbitron text-xs uppercase tracking-wider hover:bg-neon-green/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                打开
              </a>
            </div>

            <p className="text-xs text-cyber-muted-foreground font-mono mt-3">
              将上方链接复制到任意 RSS 阅读器即可开始订阅。
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: BookOpen, label: 'AI 资讯', value: '每日更新', color: 'text-neon-cyan border-neon-cyan' },
              { icon: Zap, label: 'AI 工具', value: '持续收录', color: 'text-neon-green border-neon-green' },
              { icon: Globe, label: '更新频率', value: '小时级', color: 'text-neon-magenta border-neon-magenta' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className={`p-4 border clip-chamfer bg-cyber-card/30 ${color}`}>
                <Icon className={`w-5 h-5 mb-2 ${color.split(' ')[0]}`} />
                <div className={`font-orbitron font-bold text-sm ${color.split(' ')[0]}`}>{value}</div>
                <div className="text-xs font-mono text-cyber-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to use */}
      <section className="py-10 border-t border-cyber-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-cyber-foreground mb-2">
              <span className="text-neon-cyan">{'>'}</span> 如何订阅
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-neon-cyan to-transparent" />
          </div>

          <div className="space-y-4">
            {[
              { step: '01', title: '复制 Feed URL', desc: '复制上方 RSS Feed 地址。', color: 'text-neon-cyan' },
              { step: '02', title: '打开 RSS 阅读器', desc: '下方列出了推荐的 RSS 阅读器，选择一款适合你的。', color: 'text-neon-green' },
              { step: '03', title: '添加订阅', desc: '在阅读器中点击"添加订阅"或"+"按钮，粘贴 Feed URL 即可。', color: 'text-neon-magenta' },
              { step: '04', title: '享受更新', desc: '每当 AI Hub 有新工具上线或资讯发布，阅读器会自动推送通知。', color: 'text-neon-yellow' },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="flex items-start gap-5">
                <div className={`font-orbitron font-black text-2xl ${color} flex-shrink-0 w-10`}>{step}</div>
                <div className="pt-1">
                  <div className="font-orbitron font-bold text-sm text-cyber-foreground uppercase tracking-wide mb-1">{title}</div>
                  <div className="text-sm font-mono text-cyber-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended readers */}
      <section className="py-10 border-t border-cyber-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-cyber-foreground mb-2">
              <span className="text-neon-magenta">{'>'}</span> 推荐阅读器
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-neon-magenta to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReaderCard
              name="Feedly"
              desc="最流行的 RSS 阅读器之一，跨平台同步，界面美观"
              platform="Web / iOS / Android"
              href="https://feedly.com"
              color="cyan"
            />
            <ReaderCard
              name="Inoreader"
              desc="功能强大的 RSS 阅读器，支持关键词过滤和自动化规则"
              platform="Web / iOS / Android"
              href="https://www.inoreader.com"
              color="green"
            />
            <ReaderCard
              name="NetNewsWire"
              desc="macOS / iOS 上最佳的免费开源 RSS 阅读器"
              platform="macOS / iOS"
              href="https://netnewswire.com"
              color="magenta"
            />
            <ReaderCard
              name="FreshRSS"
              desc="免费开源，可自托管，隐私友好"
              platform="Web / 自托管"
              href="https://freshrss.org"
              color="yellow"
            />
            <ReaderCard
              name="RSSHub Radar"
              desc="浏览器插件，自动发现页面 RSS 并一键订阅"
              platform="浏览器扩展"
              href="https://github.com/DIYgod/RSSHub-Radar"
              color="cyan"
            />
            <ReaderCard
              name="ReadYou"
              desc="Android 平台开源 RSS 阅读器，Material You 风格"
              platform="Android"
              href="https://github.com/Ashinch/ReadYou"
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Recent items preview */}
      {(recentNews.length > 0 || recentTools.length > 0) && (
        <section className="py-10 border-t border-cyber-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-cyber-foreground mb-2">
                <span className="text-neon-green">{'>'}</span> 最新 Feed 内容预览
              </h2>
              <div className="w-16 h-px bg-gradient-to-r from-neon-green to-transparent" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {recentNews.length > 0 && (
                <div>
                  <div className="text-xs font-orbitron text-neon-cyan uppercase tracking-widest mb-3">AI 资讯</div>
                  <div className="space-y-2">
                    {recentNews.map((item) => (
                      <Link
                        key={item.slug}
                        href="/news"
                        className="flex items-start gap-2 group p-3 border border-cyber-border clip-chamfer bg-cyber-card/30 hover:border-neon-cyan/50 transition-colors"
                      >
                        <ChevronRight className="w-3 h-3 text-neon-cyan mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-mono text-cyber-foreground group-hover:text-neon-cyan transition-colors line-clamp-2">{item.title}</div>
                          <div className="text-xs text-cyber-muted-foreground mt-0.5 font-mono">
                            {item.sourceName && <span>{item.sourceName} · </span>}
                            {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('zh-CN') : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {recentTools.length > 0 && (
                <div>
                  <div className="text-xs font-orbitron text-neon-green uppercase tracking-widest mb-3">新收录工具</div>
                  <div className="space-y-2">
                    {recentTools.map((tool) => (
                      <Link
                        key={tool.slug}
                        href={`/tools/${tool.slug}`}
                        className="flex items-center gap-2 group p-3 border border-cyber-border clip-chamfer bg-cyber-card/30 hover:border-neon-green/50 transition-colors"
                      >
                        <ChevronRight className="w-3 h-3 text-neon-green flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-mono text-cyber-foreground group-hover:text-neon-green transition-colors">{tool.name}</span>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 border clip-chamfer font-mono flex-shrink-0 ${
                          tool.pricingType === 'FREE' ? 'border-neon-green/30 text-neon-green/70' :
                          tool.pricingType === 'FREEMIUM' ? 'border-neon-cyan/30 text-neon-cyan/70' :
                          'border-neon-magenta/30 text-neon-magenta/70'
                        }`}>
                          {tool.pricingType}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
