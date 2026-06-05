import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: '社区公约 | AI Hub',
  description: 'AI Hub 社区公约、发帖规范与举报处理流程。',
}

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />
      
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neon-magenta/5 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-cyber-foreground uppercase tracking-wider mb-4">
              <span className="text-neon-magenta">{'>'}</span> 社区公约
            </h1>
            <p className="text-cyber-muted-foreground font-mono text-sm">
              共同维护一个友好、专业、有价值的AI工具社区
            </p>
          </div>

          <div className="space-y-8">
            {/* 总则 */}
            <Section icon="📜" title="总则" color="border-neon-green/50">
              <p className="text-cyber-muted-foreground font-mono text-sm leading-relaxed">
                AI Hub 致力于为AI工具爱好者和从业者提供一个开放、友善、有价值的交流平台。
                所有用户在社区内的言行应遵守以下原则，共同维护良好的社区氛围。
              </p>
            </Section>

            {/* 禁止行为 */}
            <Section icon="🚫" title="禁止行为" color="border-neon-magenta/50">
              <ul className="space-y-3 text-cyber-muted-foreground font-mono text-sm">
                {[
                  '发布垃圾广告、恶意推广或重复灌水内容',
                  '人身攻击、辱骂、歧视、骚扰其他用户',
                  '发布色情、暴力、违法或政治敏感内容',
                  '侵犯他人知识产权，擅自转载未授权的原创内容',
                  '恶意刷屏、刷赞、刷评论等破坏社区秩序的行为',
                  '冒充他人或官方人员，进行欺诈行为',
                  '分享恶意软件、钓鱼链接或其他有害信息',
                  '利用平台漏洞进行不正当操作'
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-neon-magenta mt-0.5 flex-shrink-0">◆</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* 发帖规范 */}
            <Section icon="📝" title="发帖规范" color="border-neon-cyan/50">
              <ul className="space-y-3 text-cyber-muted-foreground font-mono text-sm">
                {[
                  '工具分享：请提供工具名称、描述和相关链接，确保信息准确',
                  '技术分享：内容应有一定的技术深度，鼓励原创和经验分享',
                  '问答求助：描述问题时应尽量详细，包括背景、已尝试的解决方案等',
                  '生活圈：分享AI相关的日常趣事、使用心得等轻松内容',
                  '发布内容请选择正确的分类，方便其他用户查找',
                  '转载他人内容请注明出处，并获得授权',
                  '重复发帖将被合并或删除'
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-neon-cyan mt-0.5 flex-shrink-0">➤</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* 审核机制 */}
            <Section icon="🔍" title="审核机制" color="border-neon-green/50">
              <div className="space-y-3 text-cyber-muted-foreground font-mono text-sm leading-relaxed">
                <p>新发布的工具和分享会进入审核队列，由管理员审核通过后方可公开展示。</p>
                <p>审核通常在 24 小时内完成。审核标准：</p>
                <ul className="space-y-2 mt-2">
                  {[
                    '内容是否符合分类要求',
                    '是否包含违规信息',
                    '信息是否真实有效',
                    '是否重复提交'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-neon-green mt-0.5 flex-shrink-0">◈</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>

            {/* 举报与处理 */}
            <Section icon="⚖️" title="举报与处理" color="border-neon-magenta/50">
              <div className="space-y-3 text-cyber-muted-foreground font-mono text-sm leading-relaxed">
                <p>如发现违规内容，可通过以下方式举报：</p>
                <ul className="space-y-2 mt-2 mb-4">
                  {[
                    '在分享内容上点击「举报」按钮提交举报',
                    '选择举报原因（垃圾广告/人身攻击/侵权/违规内容/其他）',
                    '可补充说明，帮助我们更快处理'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-neon-magenta mt-0.5 flex-shrink-0">◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>管理员收到举报后会及时处理。处理方式包括：</p>
                <ul className="space-y-2 mt-2">
                  {[
                    '核实内容，如属实则下架相关内容',
                    '对违规用户进行警告或封禁',
                    '处理结果会通知举报者'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-neon-magenta mt-0.5 flex-shrink-0">◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>

            {/* 免责声明 */}
            <Section icon="⚠️" title="免责声明" color="border-amber-500/50">
              <div className="space-y-3 text-cyber-muted-foreground font-mono text-sm leading-relaxed">
                <p>AI Hub 是一个开放平台，用户发布的内容仅代表其个人观点，不代表平台立场。</p>
                <p>平台尽可能确保内容质量，但不对第三方工具或信息的准确性、完整性作保证。</p>
                <p>使用社区中的工具或建议产生的任何后果，由用户自行承担。</p>
                <p className="text-cyber-muted-foreground/60 mt-4 text-xs">本公约自发布之日起生效，AI Hub 保留随时修改和解释的权利。</p>
              </div>
            </Section>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Section({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`bg-cyber-card border ${color} clip-chamfer p-6`}>
      <h2 className="text-lg font-orbitron font-bold text-cyber-foreground uppercase tracking-wider mb-4 flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-foreground to-cyber-muted-foreground">
          {title}
        </span>
      </h2>
      {children}
    </div>
  )
}
