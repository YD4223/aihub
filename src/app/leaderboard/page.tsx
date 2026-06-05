import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { 
  TrendingUp, Heart, MessageCircle, Eye, Users,
  ArrowUp, ArrowDown, Minus, Flame,
  Code, Sparkles, Wrench, HelpCircle, Crown
} from 'lucide-react'

export const metadata: Metadata = {
  title: '动态排行榜 | AI Hub',
  description: '查看AI Hub社区的热门分享、热门工具、活跃用户排行榜，发现最新最热的内容。',
}

export const revalidate = 600

interface Props {
  searchParams: { tab?: string }
}

const TAB_CONFIG = {
  shares: { label: '热门分享', icon: Flame, color: 'neon-green', activeBg: 'bg-neon-green text-cyber-background shadow-neon' },
  users: { label: '活跃用户', icon: Users, color: 'neon-magenta', activeBg: 'bg-neon-magenta/80 text-cyber-background shadow-neon-secondary' },
  trending: { label: '趋势上升', icon: TrendingUp, color: 'neon-green/80', activeBg: 'bg-neon-green/80 text-cyber-background shadow-neon' },
} as const

type TabKey = keyof typeof TAB_CONFIG

function getTypeLabel(type: string) {
  switch (type) {
    case 'tool': return <><Wrench className="w-3 h-3 inline mr-0.5" />工具圈</>
    case 'life': return <><Sparkles className="w-3 h-3 inline mr-0.5" />生活圈</>
    case 'tech_share': return <><Code className="w-3 h-3 inline mr-0.5" />技术分享</>
    case 'qa_help': return <><HelpCircle className="w-3 h-3 inline mr-0.5" />问答求助</>
    default: return type
  }
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function timeAgo(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  return `${months}个月前`
}

function getRankColor(index: number) {
  if (index === 0) return 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]'
  if (index === 1) return 'text-gray-300 drop-shadow-[0_0_4px_rgba(209,213,219,0.4)]'
  if (index === 2) return 'text-amber-600 drop-shadow-[0_0_4px_rgba(217,119,6,0.4)]'
  return 'text-cyber-muted-foreground'
}

function getRankBg(index: number) {
  if (index === 0) return 'bg-yellow-500/20 border-yellow-500/50'
  if (index === 1) return 'bg-gray-300/10 border-gray-300/30'
  if (index === 2) return 'bg-amber-600/20 border-amber-600/50'
  return 'bg-cyber-muted/30 border-cyber-border'
}

async function getLeaderboard(type: TabKey, limit = 20) {
  try {
    if (type === 'users') {
      const users = await prisma.$queryRawUnsafe(`
        SELECT u.id, u.username, u."avatarUrl", u."createdAt" as "joinDate",
          COUNT(DISTINCT s.id) as "shareCount",
          COALESCE(SUM(s.likes), 0) as "totalLikes",
          (SELECT COUNT(*) FROM share_comments sc WHERE sc."userId" = u.id AND sc.status = 'approved') as "commentCount"
        FROM users u
        LEFT JOIN shares s ON s."userId" = u.id AND s.status = 'approved'
        WHERE u.role != 'BANNED'
        GROUP BY u.id
        HAVING COUNT(DISTINCT s.id) > 0
        ORDER BY "shareCount" DESC, "totalLikes" DESC
        LIMIT ${limit}
      `)
      return users as any[]
    }

    if (type === 'trending') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dateStr = sevenDaysAgo.toISOString().split('T')[0]

      const trending = await prisma.$queryRawUnsafe(`
        SELECT t.id, t.name, t.slug, t."viewCount", t.stars, t.upvotes,
          t."shortDesc",
          COALESCE(h1."viewCount", 0) as "todayViews",
          h7."viewCount" as "weekAgoViews",
          c.name as "categoryName"
        FROM tools t
        LEFT JOIN categories c ON t."categoryId" = c.id
        LEFT JOIN LATERAL (
          SELECT "viewCount" FROM tool_trend_histories
          WHERE "toolId" = t.id AND date = CURRENT_DATE::text
          ORDER BY date DESC LIMIT 1
        ) h1 ON true
        LEFT JOIN LATERAL (
          SELECT "viewCount" FROM tool_trend_histories
          WHERE "toolId" = t.id AND date = $1
          ORDER BY date DESC LIMIT 1
        ) h7 ON true
        WHERE t.status = 'approved' AND t."isActive" = true
          AND h1."viewCount" IS NOT NULL
        ORDER BY
          CASE WHEN h7."viewCount" IS NOT NULL AND h7."viewCount" > 0
            THEN (h1."viewCount" - h7."viewCount")::float / h7."viewCount"
            ELSE 0
          END DESC,
          t."viewCount" DESC
        LIMIT ${limit}
      `, dateStr)
      return trending as any[]
    }

    // 默认：热门分享
    const shares = await prisma.$queryRawUnsafe(`
      SELECT s.id, s.content, s.likes, s.type, s."createdAt",
        s."viewCount",
        u.id as "userId", u.username as "userName", u."avatarUrl" as "userAvatarUrl",
        t.name as "toolName", t.slug as "toolSlug", t."shortDesc" as "toolShortDesc",
        (SELECT COUNT(*) FROM share_comments sc WHERE sc."shareId" = s.id AND (sc.status IS NULL OR sc.status = 'approved')) as "commentsCount"
      FROM shares s
      LEFT JOIN users u ON s."userId" = u.id
      LEFT JOIN tools t ON s."toolId" = t.id
      WHERE s.status = 'approved'
      ORDER BY s.likes DESC, s."createdAt" DESC
      LIMIT ${limit}
    `)

    return (shares as any[]).map((s: any) => ({
      id: s.id,
      content: s.content,
      likes: Number(s.likes),
      viewCount: Number(s.viewCount || 0),
      type: s.type,
      createdAt: s.createdAt,
      commentsCount: Number(s.commentsCount || 0),
      user: {
        id: s.userId,
        username: s.userName,
        avatarUrl: s.userAvatarUrl
      },
      tool: s.toolName ? {
        name: s.toolName,
        slug: s.toolSlug,
        shortDesc: s.toolShortDesc
      } : null
    }))
  } catch (error: any) {
    console.error('获取排行榜失败:', error)
    return []
  }
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    '#00ff88', '#00d4ff', '#ff00ff', '#ff3366', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
  ]
  return colors[Math.abs(hash) % colors.length]
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const tab = (searchParams.tab as TabKey) || 'shares'
  const validTab = tab in TAB_CONFIG ? tab : 'shares'
  const data = await getLeaderboard(validTab)
  const config = TAB_CONFIG[validTab]

  return (
    <div className="min-h-screen bg-cyber-background">
      <Navbar />
      
      {/* Hero */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neon-green/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-orbitron font-bold text-cyber-foreground uppercase tracking-wider mb-4">
              <span className="text-neon-magenta">{'>'}</span> 动态排行榜
            </h1>
            <p className="text-cyber-muted-foreground font-mono text-sm max-w-2xl mx-auto">
              实时统计社区数据，发现最受欢迎的工具、最活跃的分享和用户
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab 切换 */}
          <div className="bg-cyber-card border border-cyber-border clip-chamfer p-2 mb-8">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {(Object.entries(TAB_CONFIG) as [TabKey, typeof config][]).map(([key, item]) => (
                <Link
                  key={key}
                  href={`/leaderboard?tab=${key}`}
                  className={`flex-shrink-0 md:flex-1 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3 clip-chamfer-sm text-sm font-mono uppercase tracking-wider transition-all duration-300 ${
                    validTab === key
                      ? item.activeBg + ' font-bold'
                      : 'text-cyber-muted-foreground hover:text-cyber-foreground hover:bg-cyber-muted/30'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 排行榜榜单 */}
          <div className="space-y-3">
            {data.length === 0 && (
              <div className="bg-cyber-card border border-cyber-border clip-chamfer p-12 text-center">
                {validTab === 'trending' ? (
                  <>
                    <p className="text-cyber-muted-foreground font-mono mb-2">趋势数据收集中...</p>
                    <p className="text-cyber-muted-foreground/60 text-xs font-mono">每日UTC 2:00自动记录，积累几天后即可显示涨幅排名</p>
                  </>
                ) : (
                  <p className="text-cyber-muted-foreground font-mono">暂无排行数据</p>
                )}
              </div>
            )}

            {validTab === 'shares' && (data as any[]).map((item: any, index: number) => (
              <Link
                key={item.id}
                href={`/share/${item.id}`}
                className={`block bg-cyber-card border ${getRankBg(index)} clip-chamfer p-4 hover:bg-cyber-muted/50 transition-all duration-200 group`}
              >
                <div className="flex items-center gap-4">
                  {/* 排名 */}
                  <div className={`w-10 h-10 flex items-center justify-center font-orbitron font-bold text-lg ${getRankColor(index)} flex-shrink-0`}>
                    {index === 0 ? <Crown className="w-6 h-6" /> : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.user?.avatarUrl ? (
                        <div className="w-6 h-6 clip-chamfer-sm overflow-hidden flex-shrink-0 border border-cyber-border">
                          <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div
                          className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-cyber-background clip-chamfer-sm flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${stringToColor(item.user?.username || '?')}, #00d4ff)` }}
                        >
                          {item.user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-xs text-cyber-muted-foreground font-mono truncate">{item.user?.username}</span>
                      {item.type && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-cyber-muted/50 text-cyber-muted-foreground font-mono whitespace-nowrap flex-shrink-0 clip-chamfer-sm">
                          {getTypeLabel(item.type)}
                        </span>
                      )}
                      <span className="text-[10px] text-cyber-muted-foreground/50 font-mono ml-auto">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-cyber-foreground line-clamp-1 group-hover:text-neon-green transition-colors font-mono">
                      {item.content}
                    </p>
                    {item.tool?.name && (
                      <p className="text-xs text-cyber-muted-foreground/60 mt-0.5 font-mono">
                        关联工具: <span className="text-neon-cyan">{item.tool.name}</span>
                      </p>
                    )}
                  </div>

                  {/* 数据 */}
                  <div className="flex items-center gap-3 text-xs text-cyber-muted-foreground flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-neon-green" />
                      {formatNumber(item.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-neon-cyan" />
                      {item.commentsCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {validTab === 'users' && (data as any[]).map((item: any, index: number) => (
              <Link
                key={item.id}
                href={`/u/${item.id}`}
                className={`block bg-cyber-card border ${getRankBg(index)} clip-chamfer p-4 hover:bg-cyber-muted/50 transition-all duration-200 group`}
              >
                <div className="flex items-center gap-4">
                  {/* 排名 */}
                  <div className={`w-10 h-10 flex items-center justify-center font-orbitron font-bold text-lg ${getRankColor(index)} flex-shrink-0`}>
                    {index === 0 ? <Crown className="w-6 h-6" /> : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>

                  {/* 头像 */}
                  {item.avatarUrl ? (
                    <div className="w-10 h-10 clip-chamfer-sm overflow-hidden flex-shrink-0 border border-cyber-border">
                      <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 flex items-center justify-center text-sm font-bold text-cyber-background clip-chamfer-sm flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${stringToColor(item.username || '?')}, #00ff88)` }}
                    >
                      {item.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-orbitron font-bold text-cyber-foreground group-hover:text-neon-green transition-colors">
                      {item.username}
                    </h3>
                    <p className="text-xs text-cyber-muted-foreground/60 mt-0.5 font-mono">
                      {item.joinDate && `加入于 ${new Date(item.joinDate).toLocaleDateString('zh-CN')}`}
                    </p>
                  </div>

                  {/* 数据 */}
                  <div className="flex items-center gap-3 text-xs text-cyber-muted-foreground flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      {formatNumber(Number(item.shareCount))} 分享
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-neon-green" />
                      {formatNumber(Number(item.totalLikes))}
                    </span>
                    <span className="text-cyber-muted-foreground/50">
                      <MessageCircle className="w-3.5 h-3.5 inline text-neon-cyan" /> {item.commentCount || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {validTab === 'trending' && (data as any[]).map((item: any, index: number) => {
              const todayViews = Number(item.todayViews || 0)
              const weekAgoViews = Number(item.weekAgoViews || 0)
              let growth = 0
              if (weekAgoViews > 0 && todayViews > 0) {
                growth = Math.round((todayViews - weekAgoViews) / weekAgoViews * 100)
              } else if (todayViews > 0 && weekAgoViews === 0 && item.weekAgoViews !== null) {
                // 7天前是0但今天有 - 从无到有
                growth = 999
              }
              
              return (
                <Link
                  key={item.id}
                  href={`/tools/${item.slug}`}
                  className={`block bg-cyber-card border ${getRankBg(index)} clip-chamfer p-4 hover:bg-cyber-muted/50 transition-all duration-200 group`}
                >
                  <div className="flex items-center gap-4">
                    {/* 排名 */}
                    <div className={`w-10 h-10 flex items-center justify-center font-orbitron font-bold text-lg ${getRankColor(index)} flex-shrink-0`}>
                      {index === 0 ? <Flame className="w-6 h-6 text-orange-500" /> : `#${index + 1}`}
                    </div>

                    {/* Logo - 统一首字母 */}
                    <div className="w-10 h-10 flex items-center justify-center bg-neon-cyan/10 border border-neon-cyan/30 clip-chamfer-sm flex-shrink-0">
                      <span className="text-lg font-bold text-neon-cyan font-orbitron">
                        {item.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-orbitron font-bold text-cyber-foreground group-hover:text-neon-green transition-colors truncate">
                        {item.name}
                      </h3>
                      {item.shortDesc && (
                        <p className="text-xs text-cyber-muted-foreground/60 mt-0.5 font-mono truncate">{item.shortDesc}</p>
                      )}
                    </div>

                    {/* 增长数据 */}
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <span className="flex items-center gap-1 text-cyber-muted-foreground">
                        <Eye className="w-3.5 h-3.5 text-neon-cyan" />
                        {formatNumber(Number(item.viewCount))}
                      </span>
                      <span className={`flex items-center gap-1 font-mono font-bold ${
                        growth > 0 ? 'text-neon-green' : growth < 0 ? 'text-neon-magenta' : 'text-cyber-muted-foreground'
                      }`}>
                        {growth > 0 ? <ArrowUp className="w-3.5 h-3.5" /> : growth < 0 ? <ArrowDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        {growth > 0 ? '+' : ''}{growth}%
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
