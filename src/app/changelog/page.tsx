import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Clock, Github, MessageSquare, ArrowUpRight, Sparkles, Shield, Zap, Bug, Wrench, Star } from 'lucide-react'

export const revalidate = 14400

const updates = [
  {
    date: '2026-06-25',
    title: '验证码防封 & 邮箱优化',
    icon: Shield,
    color: 'text-neon-green',
    items: [
      '📧 修复 QQ 邮箱发信被风控封禁（全局限流）',
      '🔒 新增每小时 20 封邮件上限，保护发信邮箱',
      '📋 四层防护：全局限流 → IP限流 → 邮箱冷却 → 已注册检测',
      '⚡ 更新授权码后验证码已恢复正常发送',
    ]
  },
  {
    date: '2026-06-07',
    title: '用户分享分页 & 社区体验优化',
    icon: Sparkles,
    color: 'text-neon-cyan',
    items: [
      '📄 用户分享4个分类统一改为页码导航（支持 ?page=N）',
      '🎨 加载更多卡片改用 UserShareCard，样式与初始卡片一致',
      '🏷️ Tab 徽标改为显示分类总数量，不受分页影响',
      '🔧 修复技术/问答tab加载更多拿到全部类型的bug',
      '⚡ 后台今日新增统计修复（新版查询别名问题）',
    ]
  },
  {
    date: '2026-06-06',
    title: '全网搜索 & 额度优化',
    icon: Sparkles,
    color: 'text-neon-cyan',
    items: [
      '🔍 全网百科搜索（Wikipedia 站内阅读，无需翻墙）',
      '🖼️ R2 图片上传修复，工具提交图不再占数据库',
      '⚡ 额度优化：ISR 30分钟/API缓存/搜索需登录',
      '📱 手机端布局修复（搜索框/排行榜/admin卡片）',
      '🎯 排行榜趋势榜数据不足时按浏览量排序',
      '🏠 首页新增热门话题标签',
      '⚙️ 后台统计5分钟轮询+合并查询（省额度）',
    ]
  },
  {
    date: '2026-06-05',
    title: '社区全面升级 & 动态排行榜',
    icon: Sparkles,
    color: 'text-neon-magenta',
    items: [
      '🏆 新增动态排行榜页（热门分享/活跃用户/趋势上升）',
      '📊 每日自动记录工具趋势数据（GitHub Actions）',
      '🔔 通知系统补全：工具提交→管理员、审核结果→作者',
      '📜 新增社区公约页面，规范社区行为',
      '📋 用户分享区扩展为4类（工具圈/生活圈/技术分享/问答求助）',
      '🏠 首页展示全部4类分享+热门话题标签+类型图标',
      '🔧 AI 自动互动改为直连数据库（修复不回复bug）',
      '🖼️ 修复无头像用户评论显示损坏图片图标',
      '📱 手机端分类tab改为横向滚动',
      '👤 用户主页去掉重复的「提交的工具」tab',
      '🏷️ 全局标签文字不换行修复',
      '🔌 数据库连接池优化，减少超限错误',
    ]
  },
  {
    date: '2026-05-31',
    title: '移动端适配 & 更新日志上线',
    icon: Bug,
    color: 'text-neon-magenta',
    items: [
      '📱 修复手机端「官网」按钮文字被截断',
      '📱 修复开源页面分类标签被挤压问题',
      '📱 按钮自动换行，不挤占标题空间',
      '📋 新增更新日志页面（Footer 可访问）',
      '💬 支持通过 GitHub Issues 提交反馈',
    ]
  },
  {
    date: '2026-05-31',
    title: '安全加固 & SEO优化',
    icon: Shield,
    color: 'text-neon-green',
    items: [
      '🛡️ API 关闭外部访问，防止恶意爬取',
      '🤖 防爬增强：拦截非浏览器脚本请求',
      '📈 OG描述扩充，搜索引擎展示更完整',
      '⚡ API 加 CDN 缓存，降低带宽消耗',
    ]
  },
  {
    date: '2026-05-30',
    title: '趋势榜 & Supabase优化',
    icon: Zap,
    color: 'text-neon-magenta',
    items: [
      '🔥 新建趋势榜页面（热度飙升/最新上榜/高分榜）',
      '⭐ 工具卡片始终显示 GitHub Star 数',
      '🔔 crawl:latest 完成后自动通知搜索引擎',
      '💾 API 加 5 分钟 CDN 缓存，降低数据库带宽',
    ]
  },
  {
    date: '2026-05-29',
    title: '分类页优化 & sitemap修复',
    icon: Wrench,
    color: 'text-neon-cyan',
    items: [
      '🔗 /category/[slug] 自动跳转到 /tools?category=[slug]',
      '🗺️ sitemap 移除不存在的死链接',
      '📝 多个页面元描述扩充到 150+ 字符',
    ]
  },
  {
    date: '2026-05-28',
    title: 'GitHub Star补全 & 爬虫增强',
    icon: Star,
    color: 'text-neon-yellow',
    items: [
      '⭐ 补全 12 个工具的 GitHub 真实 Star 数',
      '🕷️ crawl:latest 两阶段爬取（热门补缺口 + 近期新项目）',
      '🌐 新增 450+ 工具中文简介翻译',
      '📦 工具总数突破 1000+',
    ]
  },
  {
    date: '2026-05-20',
    title: '社区优化第一阶段 - 通知系统上线',
    icon: MessageSquare,
    color: 'text-neon-cyan',
    items: [
      '🔔 Navbar 铃铛图标 + 未读红点',
      '📋 独立通知页 + 用户中心通知 Tab',
      '✅ 单条/全部标记已读',
      '📬 评论、点赞、关注、系统四种通知类型',
    ]
  },
]

export const metadata = {
  title: '更新日志 | AI Hub',
  description: '查看AI Hub的最新更新动态，了解我们新增的功能、修复的Bug和优化改进。',
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-cyber-foreground">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyber-muted border border-cyber-border rounded-lg mb-6 font-mono text-sm">
            <Clock className="w-4 h-4 text-neon-green" />
            <span className="text-neon-green">更新日志</span>
          </div>
          <h1 className="text-4xl font-orbitron font-black mb-4">
            <span className="text-neon-green">改</span>
            <span className="text-neon-magenta">进</span>
            <span className="text-cyber-foreground">日志</span>
          </h1>
          <p className="text-cyber-muted-foreground max-w-xl mx-auto">
            记录 AI Hub 的每一次改进，让您清楚了解我们做了什么、正在做什么
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-neon-green via-neon-magenta to-transparent" />

          {updates.map((update, idx) => (
            <div key={idx} className="relative pl-16 pb-12 last:pb-0">
              {/* Timeline dot */}
              <div className={`absolute left-4 w-5 h-5 rounded-full bg-cyber-card border-2 border-cyber-border flex items-center justify-center ${update.color}`}>
                <div className="w-2 h-2 rounded-full bg-current" />
              </div>

              {/* Card */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-6 hover:border-neon-green/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-cyber-muted ${update.color}`}>
                    <update.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-cyber-foreground">{update.title}</h2>
                    <p className="text-sm text-cyber-muted-foreground font-mono">{update.date}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {update.items.map((item, i) => (
                    <li key={i} className="text-sm text-cyber-muted-foreground flex items-start gap-2">
                      <span className="text-neon-green mt-0.5">▸</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="mt-12 bg-cyber-card border border-cyber-border rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyber-muted text-neon-magenta mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-orbitron font-bold mb-2">有想法？告诉我们</h2>
          <p className="text-cyber-muted-foreground text-sm mb-6 max-w-md mx-auto">
            遇到 Bug、有功能建议、或者单纯想给点反馈？欢迎在 GitHub 提交 Issue
          </p>
          <a
            href="https://github.com/YD4223/aihub/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neon-green/10 border border-neon-green/50 text-neon-green rounded-lg hover:bg-neon-green/20 transition-all font-mono text-sm"
          >
            <Github className="w-4 h-4" />
            提交反馈
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-sm text-cyber-muted-foreground hover:text-neon-green transition-colors font-mono">
            ← 返回首页
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
