import type { Metadata } from 'next'
import './globals.css'
import BackToTop from '@/components/BackToTop'

export const metadata: Metadata = {
  title: 'AI Hub - 全球AI工具聚合平台',
  description: 'AI Hub收录海量AI工具、开源项目和最新AI资讯，涵盖聊天对话、图像生成、视频生成、代码助手等分类。每日更新，一站式发现全球AI工具。',
  keywords: 'AI工具, AI导航, 人工智能工具, AI工具导航站, 免费AI工具, AI集合, AI汇总',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'AI Hub - 全球AI工具聚合平台',
    description: '收录海量AI工具与最新AI资讯，每日更新',
    type: 'website',
    locale: 'zh_CN',
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'language': 'zh-CN',
    'og:locale:alternate': 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="bg-[#0a0a0f]">
      <body className="min-h-screen bg-[#0a0a0f] text-cyber-foreground font-mono relative transition-colors duration-300">
        {/* Grid Background Pattern - Hidden in light mode */}
        <div className="fixed inset-0 grid-pattern pointer-events-none dark-only" />
        
        {/* Circuit Pattern Overlay - Hidden in light mode */}
        <div className="fixed inset-0 circuit-pattern pointer-events-none opacity-50 dark-only" />
        
        {/* Scanline Overlay - Hidden in light mode */}
        <div className="scanlines dark-only" />
        
        {/* Light mode subtle background pattern */}
        <div className="fixed inset-0 light-only pointer-events-none opacity-30" 
          style={{
            backgroundImage: 'linear-gradient(rgba(0,184,148,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,184,148,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} 
        />
        
        {/* Main Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        <BackToTop />

        {/* 百度统计 */}
        <script
          dangerouslySetInnerHTML={{
            __html: [
              'var _hmt = _hmt || [];',
              '(function() {',
              '  var hm = document.createElement("script");',
              '  hm.src = "https://hm.baidu.com/hm.js?c1237f3793cdd5e33b25d70dc0911c49";',
              '  var s = document.getElementsByTagName("script")[0]; ',
              '  s.parentNode.insertBefore(hm, s);',
              '})();'
            ].join('\n')
          }}
        />
        {/* Cloudflare Web Analytics */}
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "d65a7e9772b64b83b38a2cfbbab4dd19"}'></script>
      </body>
    </html>
  )
}
