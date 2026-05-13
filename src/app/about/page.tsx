import Link from 'next/link'
import { BrainCircuit, Github, Zap, Globe, Users, Shield, Code2, Cpu, Radio, Heart, Target, Eye } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactButton from '@/components/ContactButton'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '关于我们 | AI Hub',
  description: '了解 AI Hub 的使命、团队与发展历程',
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

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: 'cyan' | 'green' | 'magenta' | 'yellow' }) {
  const colorMap = {
    cyan: 'border-neon-cyan text-neon-cyan',
    green: 'border-neon-green text-neon-green',
    magenta: 'border-neon-magenta text-neon-magenta',
    yellow: 'border-neon-yellow text-neon-yellow',
  }
  const cornerMap = {
    cyan: 'border-neon-cyan',
    green: 'border-neon-green',
    magenta: 'border-neon-magenta',
    yellow: 'border-neon-yellow',
  }
  return (
    <div className={`relative p-6 border ${colorMap[color]} clip-chamfer bg-cyber-card/50 backdrop-blur-sm group hover:-translate-y-1 transition-transform duration-300`}>
      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${cornerMap[color]}`} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${cornerMap[color]}`} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${cornerMap[color]}`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${cornerMap[color]}`} />

      <Icon className={`w-8 h-8 mb-4 ${colorMap[color].split(' ')[1]}`} />
      <h3 className="font-orbitron font-bold text-cyber-foreground mb-2 uppercase tracking-wide text-sm">{title}</h3>
      <p className="text-cyber-muted-foreground text-sm font-mono leading-relaxed">{desc}</p>
    </div>
  )
}

function TimelineItem({ year, title, desc, isLast = false }: { year: string; title: string; desc: string; isLast?: boolean }) {
  return (
    <div className="flex gap-6">
      {/* Line */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-neon-cyan border-2 border-neon-cyan shadow-[0_0_8px_#00d4ff] flex-shrink-0 mt-1" />
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-neon-cyan/50 to-transparent mt-1" />}
      </div>
      {/* Content */}
      <div className="pb-8">
        <span className="text-xs font-orbitron text-neon-cyan tracking-widest">{year}</span>
        <h4 className="font-orbitron font-bold text-cyber-foreground mt-1 mb-2 text-sm uppercase tracking-wide">{title}</h4>
        <p className="text-cyber-muted-foreground text-sm font-mono leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default async function AboutPage() {
  // 从数据库获取真实统计数据
  const [toolCount, categoryCount] = await Promise.all([
    prisma.tool.count({ where: { status: 'approved', isActive: true } }),
    prisma.category.count(),
  ])
  
  return (
    <div className="min-h-screen bg-cyber-background text-cyber-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        {/* Decorative scan line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-60" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-neon-green/40 clip-chamfer bg-neon-green/5 mb-8">
            <Radio className="w-3 h-3 text-neon-green animate-pulse" />
            <span className="text-xs font-orbitron text-neon-green tracking-widest uppercase">ABOUT US</span>
          </div>

          <GlitchHeading text="关于 AI HUB" className="text-4xl md:text-6xl text-cyber-foreground mb-6" />

          <p className="text-lg text-cyber-muted-foreground font-mono leading-relaxed max-w-2xl mx-auto">
            我们是一群热爱 AI 技术的开发者。<br />
            致力于为中文用户打造最好用的 AI 工具导航平台。
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-8 mt-12">
            {[
              { value: toolCount + '+', label: 'AI 工具' },
              { value: categoryCount + '+', label: '工具分类' },
              { value: '日更', label: '资讯更新' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-orbitron font-black text-neon-cyan">{s.value}</div>
                <div className="text-xs font-mono text-cyber-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 border-t border-cyber-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-8 border border-neon-green/30 clip-chamfer bg-cyber-card/30">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-green" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-green" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-green" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-green" />

            <div className="flex items-center gap-3 mb-4">
              <Target className="w-5 h-5 text-neon-green" />
              <h2 className="font-orbitron font-bold text-lg uppercase tracking-wider text-cyber-foreground">
                <span className="text-neon-green">{'>'}</span> 我们的使命
              </h2>
            </div>
            <p className="text-cyber-muted-foreground font-mono leading-relaxed text-sm">
              AI 时代日新月异，每天都有数百款新工具诞生。我们的使命是通过精心筛选、分类整理，帮助你在信息洪流中快速找到真正有用的 AI 工具。
              无论你是开发者、设计师、内容创作者还是普通用户，AI Hub 都能帮你发现提升效率的最佳 AI 伙伴。
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-orbitron font-bold text-2xl uppercase tracking-wider text-cyber-foreground mb-2">
              <span className="text-neon-magenta">{'>'}</span> 平台特色
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-neon-magenta to-transparent mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Zap}
              color="cyan"
              title="实时更新"
              desc="每日自动抓取全球 AI 动态，RSS 订阅 + 人工筛选双重保障，确保信息新鲜度。"
            />
            <FeatureCard
              icon={Shield}
              color="green"
              title="精心筛选"
              desc="每款工具均经过人工审核，过滤低质内容，保证你看到的都是真正有价值的工具。"
            />
            <FeatureCard
              icon={Globe}
              color="magenta"
              title="全球视野"
              desc="覆盖 ChatGPT、Midjourney、Cursor 等数百款全球热门 AI 工具，中文界面一网打尽。"
            />
            <FeatureCard
              icon={Users}
              color="yellow"
              title="社区驱动"
              desc="用户可以提交工具、撰写评测、分享心得，让平台内容更丰富、更真实。"
            />
            <FeatureCard
              icon={Code2}
              color="cyan"
              title="开放 API"
              desc="提供工具数据 API 接口，开发者可以免费调用，构建自己的 AI 工具应用。"
            />
            <FeatureCard
              icon={Eye}
              color="green"
              title="趋势洞察"
              desc="基于用户访问和收藏数据，实时生成 AI 工具热度趋势榜，帮你把握市场动向。"
            />
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 border-t border-cyber-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-orbitron font-bold text-2xl uppercase tracking-wider text-cyber-foreground mb-2">
              <span className="text-neon-cyan">{'>'}</span> 发展历程
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent mx-auto" />
          </div>

          <div className="pl-2">
            <TimelineItem
              year="2024.Q1"
              title="项目启动"
              desc="产生创建中文 AI 工具导航平台的想法，开始市场调研与技术选型，确定采用 Next.js + SQLite 技术栈。"
            />
            <TimelineItem
              year="2024.Q3"
              title="上线 Beta"
              desc="首批收录 100+ AI 工具，覆盖写作、图像、代码、视频四大核心分类，完成基础功能开发。"
            />
            <TimelineItem
              year="2025.Q1"
              title="用户社区"
              desc="新增用户注册、工具提交、评论互动等社区功能，引入人工审核机制确保内容质量。"
            />
            <TimelineItem
              year="2025.Q4"
              title="AI 资讯"
              desc="上线 AI 资讯模块，接入 RSS 自动抓取，每日更新全球最新 AI 动态。"
            />
            <TimelineItem
              year="2026.Now"
              title="持续进化"
              desc="正在开发全局搜索、消息通知、开放 API 等更多功能，欢迎一起建设！"
              isLast
            />
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="py-16 border-t border-cyber-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative p-10 border border-neon-magenta/30 clip-chamfer bg-cyber-card/20">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-magenta" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-magenta" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-magenta" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-magenta" />

            <Heart className="w-8 h-8 text-neon-magenta mx-auto mb-4" />
            <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-cyber-foreground mb-3">
              一起建设更好的 AI Hub
            </h2>
            <p className="text-cyber-muted-foreground font-mono text-sm leading-relaxed mb-6 max-w-xl mx-auto">
              有好的 AI 工具想推荐？发现了什么有趣资讯？或者想参与贡献代码？
              我们欢迎任何形式的参与！
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 border border-neon-cyan rounded-lg text-neon-cyan font-orbitron text-sm uppercase tracking-wider hover:bg-neon-cyan/10 transition-colors"
              >
                <Zap className="w-4 h-4" />
                提交工具
              </Link>
              <a
                href="https://github.com/YD4223"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 border border-cyber-border rounded-lg text-cyber-muted-foreground font-orbitron text-sm uppercase tracking-wider hover:border-neon-green hover:text-neon-green transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <ContactButton />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
