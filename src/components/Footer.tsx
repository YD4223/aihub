import Link from 'next/link'
import { BrainCircuit, Github, Mail, Radio } from 'lucide-react'
import FriendLinksBar from './FriendLinksBar'

// B站图标组件
function BilibiliIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/>
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="bg-cyber-card border-t border-cyber-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="relative">
                <BrainCircuit className="w-6 h-6 text-neon-green" />
                {/* Glitch effect layers */}
                <div className="absolute inset-0 w-6 h-6 text-neon-magenta opacity-0 group-hover:opacity-70 group-hover:translate-x-[1px] transition-all duration-100">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div className="absolute inset-0 w-6 h-6 text-neon-cyan opacity-0 group-hover:opacity-70 group-hover:-translate-x-[1px] transition-all duration-100">
                  <BrainCircuit className="w-6 h-6" />
                </div>
              </div>
              <span className="text-lg font-orbitron font-black text-cyber-foreground tracking-wider">
                <span className="text-neon-green">AI</span>
                <span className="relative">
                  HUB
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-magenta" />
                </span>
              </span>
            </Link>
            <p className="text-sm text-cyber-muted-foreground font-mono">
              发现全球最新最热的AI工具、开源项目和AI资讯
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-cyber-foreground font-orbitron font-bold mb-4 uppercase tracking-wider text-sm">
              <span className="text-neon-cyan">{'>'}</span> 导航
            </h3>
            <ul className="space-y-2 text-sm font-mono">
              <li><Link href="/tools" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">AI工具</Link></li>
              <li><Link href="/news" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">AI资讯</Link></li>
              <li><Link href="/trending" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">趋势榜</Link></li>
              <li><Link href="/opensource" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">开源项目</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-cyber-foreground font-orbitron font-bold mb-4 uppercase tracking-wider text-sm">
              <span className="text-neon-magenta">{'>'}</span> 资源
            </h3>
            <ul className="space-y-2 text-sm font-mono">
              <li><Link href="/about" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">关于我们</Link></li>
              <li><Link href="/submit" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">提交工具</Link></li>
              <li><Link href="/api-docs" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">API文档</Link></li>
              <li><Link href="/rss" className="text-cyber-muted-foreground hover:text-neon-green transition-colors">RSS订阅</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-cyber-foreground font-orbitron font-bold mb-4 uppercase tracking-wider text-sm">
              <span className="text-neon-yellow">{'>'}</span> 关注我
            </h3>
            <div className="flex gap-4">
              <a 
                href="https://github.com/YD4223" 
                target="_blank" 
                rel="noopener noreferrer" 
                title="GitHub"
                className="text-cyber-muted-foreground hover:text-neon-green transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://b23.tv/smNNJTa" 
                target="_blank" 
                rel="noopener noreferrer" 
                title="Bilibili"
                className="text-cyber-muted-foreground hover:text-neon-green transition-colors"
              >
                <BilibiliIcon className="w-5 h-5" />
              </a>
              <a 
                href="mailto:508002830@qq.com" 
                title="商务合作"
                className="text-cyber-muted-foreground hover:text-neon-green transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
            <a 
              href="mailto:508002830@qq.com"
              className="text-xs text-cyber-muted-foreground mt-2 font-mono hover:text-neon-green transition-colors block"
            >
              商务合作
            </a>
          </div>
        </div>

        <FriendLinksBar />

        <div className="border-t border-cyber-border mt-8 pt-8">
          {/* 免责声明 */}
          <p className="text-xs text-cyber-muted-foreground/60 text-center mb-4 px-4 font-mono">
            免责声明：本站所有工具和资源均来源于网络收集和网友分享，仅供学习交流使用。如有侵权或不妥之处，请联系我们及时处理。使用本站工具产生的任何风险和后果由用户自行承担，本站不承担任何责任。
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-cyber-muted-foreground font-mono">
            <Radio className="w-4 h-4 text-neon-green animate-pulse" />
            <span>© 2026 AI Hub. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
