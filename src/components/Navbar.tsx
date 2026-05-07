'use client'

import Link from 'next/link'
import { Search, Menu, X, Zap, Plus, User, BrainCircuit, Sun, Moon } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Avatar from '@/components/Avatar'

interface UserData {
  id: number
  username: string
  email: string
  avatarUrl?: string | null
}

// 赛博朋克风格主题切换按钮 - 小巧精致版
function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDark(savedTheme === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    if (newTheme) {
      document.documentElement.classList.remove('light-mode')
    } else {
      document.documentElement.classList.add('light-mode')
    }
  }

  if (!mounted) {
    return (
      <div className="w-7 h-7 bg-cyber-card border border-cyber-border/50" 
        style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }} 
      />
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative group w-7 h-7 flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105"
      style={{
        clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)'
      }}
      aria-label={isDark ? '切换到白昼模式' : '切换到黑夜模式'}
    >
      {/* 背景层 */}
      <span className={`absolute inset-0 transition-all duration-300 ${
        isDark 
          ? 'bg-cyber-card group-hover:bg-cyber-muted' 
          : 'bg-neon-cyan/10 group-hover:bg-neon-cyan/20'
      }`} />
      
      {/* 边框 */}
      <span className={`absolute inset-0 transition-all duration-300 ${
        isDark 
          ? 'shadow-[inset_0_0_0_1px_rgba(0,212,255,0.4)] group-hover:shadow-[inset_0_0_0_1px_rgba(0,212,255,0.7),0_0_8px_rgba(0,212,255,0.3)]' 
          : 'shadow-[inset_0_0_0_1px_rgba(0,212,170,0.5)] group-hover:shadow-[inset_0_0_0_1px_rgba(0,212,170,0.8),0_0_8px_rgba(0,212,170,0.4)]'
      }`} />
      
      {/* 小角落装饰 */}
      <span className={`absolute top-0 left-0 w-1.5 h-1.5 border-t border-l transition-colors duration-300 ${
        isDark ? 'border-neon-cyan/60' : 'border-neon-green/60'
      }`} />
      <span className={`absolute top-0 right-0 w-1.5 h-1.5 border-t border-r transition-colors duration-300 ${
        isDark ? 'border-neon-cyan/60' : 'border-neon-green/60'
      }`} />
      <span className={`absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r transition-colors duration-300 ${
        isDark ? 'border-neon-cyan/60' : 'border-neon-green/60'
      }`} />
      <span className={`absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l transition-colors duration-300 ${
        isDark ? 'border-neon-cyan/60' : 'border-neon-green/60'
      }`} />
      
      {/* 图标切换动画 */}
      <div className="relative w-3.5 h-3.5">
        {/* 太阳图标 - 白昼模式 */}
        <Sun 
          className={`absolute inset-0 w-3.5 h-3.5 transition-all duration-300 ${
            isDark 
              ? 'opacity-0 rotate-90 scale-50 text-neon-green' 
              : 'opacity-100 rotate-0 scale-100 text-neon-green'
          }`}
          style={{
            filter: isDark ? 'none' : 'drop-shadow(0 0 4px rgba(0,212,170,0.5))'
          }}
        />
        {/* 月亮图标 - 黑夜模式 */}
        <Moon 
          className={`absolute inset-0 w-3.5 h-3.5 transition-all duration-300 ${
            isDark 
              ? 'opacity-100 rotate-0 scale-100 text-neon-cyan' 
              : 'opacity-0 -rotate-90 scale-50 text-neon-cyan'
          }`}
          style={{
            filter: isDark ? 'drop-shadow(0 0 4px rgba(0,212,255,0.5))' : 'none'
          }}
        />
      </div>
    </button>
  )
}

// Glitch Logo Component
function GlitchLogo() {
  return (
    <div className="relative group">
      <div className="flex items-center gap-2">
        <div className="relative">
          <BrainCircuit className="w-8 h-8 text-neon-green" />
          {/* Glitch effect layers */}
          <div className="absolute inset-0 w-8 h-8 text-neon-magenta opacity-0 group-hover:opacity-70 group-hover:translate-x-[2px] transition-all duration-100">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div className="absolute inset-0 w-8 h-8 text-neon-cyan opacity-0 group-hover:opacity-70 group-hover:-translate-x-[2px] transition-all duration-100">
            <BrainCircuit className="w-8 h-8" />
          </div>
        </div>
        <span className="text-xl font-orbitron font-black text-cyber-foreground tracking-wider">
          <span className="text-neon-green">AI</span>
          <span className="relative">
            HUB
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-magenta" />
          </span>
        </span>
      </div>
    </div>
  )
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<UserData | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // 获取登录用户信息 + 校验单设备登录
  const doVerifySession = useCallback(() => {
    const savedUser = localStorage.getItem('user')
    if (!savedUser) {
      // bfcache 恢复时 localStorage 已被清空，清除内存中的 state
      setUser(null)
      return
    }
    const sessionToken = localStorage.getItem('sessionToken')
    const parsed = JSON.parse(savedUser)
    setUser(parsed)
    // 老用户没有 sessionToken 的话尝试获取
    const doVerify = (token: string) => {
      fetch(`/api/auth/verify?userId=${parsed.id}&token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (!data?.valid) {
            localStorage.removeItem('user')
            localStorage.removeItem('sessionToken')
            document.cookie = 'auth_token=; Max-Age=0; path=/;'
            setUser(null)
            alert('账号已在其他设备登录，已自动登出')
          }
        })
        .catch(() => {})
    }
    if (parsed?.id && sessionToken) {
      doVerify(sessionToken)
    } else if (parsed?.id) {
      // 没有 token 就去获取（已有则返回旧token，没有则生成新token）
      fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parsed.id })
      })
        .then(r => r.json())
        .then(data => {
          if (data.sessionToken) {
            localStorage.setItem('sessionToken', data.sessionToken)
            doVerify(data.sessionToken)
          }
        })
        .catch(() => {})
    }

    // 从服务器获取最新用户数据
    fetch(`/api/user/profile/${parsed.id}?viewerId=${parsed.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          const merged = { ...parsed, ...data.user }
          setUser(merged)
          localStorage.setItem('user', JSON.stringify(merged))
        }
      })
      .catch(() => {})
  }, [])

  // 挂载时立即校验
  useEffect(() => { doVerifySession() }, [doVerifySession])

  // 页面从 bfcache（历史记录）恢复时重新校验
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) doVerifySession()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [doVerifySession])

  // 防止滚动穿透
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleSearch = () => {
    const q = searchQuery.trim()
    if (q) {
      router.push(`/tools?search=${encodeURIComponent(q)}`)
      setIsSearchOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/tools', label: 'AI工具' },
    { href: '/news', label: 'AI资讯' },
    { href: '/trending', label: '趋势榜' },
    { href: '/opensource', label: '开源项目' },
  ]

  // 用户分享 - 独立高亮显示
  const shareItem = { href: '/user-share', label: '用户分享' }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-cyber-background/80 backdrop-blur-md border-b border-cyber-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 md:gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0">
              <GlitchLogo />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-0.5 md:gap-1 flex-shrink">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-1.5 md:px-2 lg:px-3 xl:px-4 py-2 font-mono text-xs md:text-sm uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                    isActive(item.href)
                      ? 'text-neon-green bg-neon-green/10 border border-neon-green/30'
                      : 'text-cyber-foreground/70 hover:text-neon-green hover:bg-neon-green/5'
                  }`}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span className="absolute bottom-1 left-1/4 right-1/4 h-px bg-neon-green shadow-neon" />
                  )}
                </Link>
              ))}
              
              {/* 用户分享 - 赛博朋克高亮按钮 */}
              <Link
                href={shareItem.href}
                className={`relative group px-2 md:px-3 lg:px-5 py-2 md:py-2.5 font-mono text-xs md:text-sm uppercase tracking-[0.15em] transition-all duration-300 ml-1 md:ml-3 overflow-hidden whitespace-nowrap ${
                  isActive(shareItem.href)
                    ? 'text-cyber-background'
                    : 'text-neon-magenta hover:text-cyber-background'
                }`}
                style={{
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                }}
              >
                {/* 背景层 */}
                <span className={`absolute inset-0 transition-all duration-300 ${
                  isActive(shareItem.href)
                    ? 'bg-neon-magenta'
                    : 'bg-neon-magenta/20 group-hover:bg-neon-magenta'
                }`} />
                
                {/* 扫描线动画 */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-magenta/20 to-transparent animate-scanline" />
                </span>
                
                {/* 边框发光 */}
                <span className={`absolute inset-0 transition-all duration-300 ${
                  isActive(shareItem.href)
                    ? 'shadow-[inset_0_0_20px_rgba(255,0,255,0.5),0_0_20px_rgba(255,0,255,0.6)]'
                    : 'shadow-[inset_0_0_0_1px_rgba(255,0,255,0.8),0_0_10px_rgba(255,0,255,0.4)] group-hover:shadow-[inset_0_0_20px_rgba(255,0,255,0.5),0_0_30px_rgba(255,0,255,0.8)]'
                }`} />
                
                {/* 角落装饰 */}
                <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-neon-magenta" />
                <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-neon-magenta" />
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-neon-magenta" />
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-neon-magenta" />
                
                {/* 内容 */}
                <span className="relative flex items-center gap-2">
                  {/* 数据流动画 */}
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-60" style={{ animationDuration: '1.5s' }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-br from-neon-cyan to-neon-magenta"></span>
                  </span>
                  <span className="font-bold">{shareItem.label}</span>
                  {/* 小箭头 - md隐藏 */}
                  <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                
                {/* 故障效果层 */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none">
                  <span className="absolute top-1/2 left-0 w-full h-px bg-neon-cyan/50 transform -translate-y-1/2 translate-x-full group-hover:animate-glitch-line" />
                </span>
              </Link>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center gap-1 md:gap-2 lg:gap-3 flex-shrink-0">
              <div className="relative flex items-center">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-green cursor-pointer"
                  onClick={handleSearch}
                />
                <input
                  type="text"
                  placeholder="搜索AI工具..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="input-cyber w-12 md:w-16 lg:w-48 xl:w-64 text-xs"
                />
              </div>
              <Link href="/submit" className="btn-cyber text-xs py-2 px-3 md:px-4">
                <Zap className="w-3 h-3 inline mr-1" />
                <span className="hidden lg:inline">提交</span>
                <span className="lg:hidden">+</span>
              </Link>
              
              {/* 用户入口 */}
              {user ? (
                <div className="group" style={{position:'relative', display:'inline-flex', alignItems:'center'}}>
                  <Link 
                    href="/user-center"
                    className="flex items-center gap-2 px-2 md:px-3 py-2 border border-cyber-border hover:border-neon-green transition-colors"
                  >
                    <Avatar
                      userId={user.id}
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                      size="xs"
                    />
                    <span className="text-xs text-cyber-foreground font-mono hidden lg:inline">{user.username}</span>
                    <span className="status-dot status-dot-online" />
                  </Link>
                  {/* 下拉菜单 */}
                  <div style={{position:'absolute', left:'0', top:'100%', marginTop:'4px', background:'#12121a', border:'1px solid #2a2a3a', transition:'all 0.2s', zIndex:'999', width:'100%', whiteSpace:'nowrap'}}
                    className="opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                  >
                    <Link href="/user-center" style={{display:'block', padding:'8px 16px', fontSize:'12px', color:'#e0e0e0', fontFamily:'monospace', textDecoration:'none'}} onMouseOver={e => e.currentTarget.style.background='#1c1c2e'} onMouseOut={e => e.currentTarget.style.background='transparent'}>👤 用户中心</Link>
                    <Link href="/user-center/edit" style={{display:'block', padding:'8px 16px', fontSize:'12px', color:'#e0e0e0', fontFamily:'monospace', textDecoration:'none'}} onMouseOver={e => e.currentTarget.style.background='#1c1c2e'} onMouseOut={e => e.currentTarget.style.background='transparent'}>⚙️ 设置</Link>
                    <button 
                      onClick={() => { 
                        localStorage.removeItem('user'); 
                        localStorage.removeItem('sessionToken'); 
                        // 清除登录cookie
                        document.cookie = 'auth_token=; Max-Age=0; path=/;';
                        window.location.href = '/' 
                      }}
                      style={{display:'block', width:'100%', textAlign:'left', padding:'8px 16px', fontSize:'12px', color:'#ff3366', fontFamily:'monospace', border:'none', background:'transparent', cursor:'pointer'}}
                      onMouseOver={e => e.currentTarget.style.background='#1c1c2e'} onMouseOut={e => e.currentTarget.style.background='transparent'}
                    >🚪 退出登录</button>
                  </div>
                </div>
              ) : (
                <Link 
                  href="/login"
                  className="btn-cyber text-xs py-2 px-3 md:px-4"
                >
                  <User className="w-3 h-3 inline mr-1" />
                  <span className="hidden lg:inline">登录</span>
                  <span className="lg:hidden">?</span>
                </Link>
              )}
              
              {/* 主题切换按钮 */}
              <ThemeToggle />
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 md:hidden">
              {/* Mobile Theme Toggle */}
              <div className="scale-75 origin-right">
                <ThemeToggle />
              </div>
              
              {/* Mobile Search Button */}
              <button
                className="p-2 text-cyber-foreground hover:text-neon-green hover:bg-neon-green/10 clip-chamfer-sm transition-colors"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="w-5 h-5" />
              </button>
              
              {/* Mobile Submit Button */}
              <Link 
                href="/submit" 
                className="p-2 text-neon-green hover:bg-neon-green/10 clip-chamfer-sm transition-colors"
              >
                <Plus className="w-5 h-5" />
              </Link>

              {/* Mobile Menu Button */}
              <button
                className="p-2 text-cyber-foreground hover:text-neon-green hover:bg-neon-green/10 clip-chamfer-sm transition-colors"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-cyber-background md:hidden">
          <div className="flex items-center gap-2 p-4 border-b border-cyber-border">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-green" />
              <input
                type="text"
                placeholder="搜索AI工具..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="input-cyber w-full"
              />
            </div>
            <button
              className="px-4 py-3 text-cyber-foreground font-mono hover:text-neon-green transition-colors"
              onClick={() => setIsSearchOpen(false)}
            >
              取消
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-cyber-muted-foreground mb-3 font-mono">
              <span className="text-neon-green">{'>'}</span> 热门搜索
            </p>
            <div className="flex flex-wrap gap-2">
              {['ChatGPT', 'Midjourney', 'Claude', 'Stable Diffusion', 'Copilot'].map((term) => (
                <button
                  key={term}
                  className="px-4 py-2 border border-cyber-border text-sm text-cyber-foreground hover:border-neon-green hover:text-neon-green clip-chamfer-sm transition-colors font-mono"
                  onClick={() => {
                    setSearchQuery(term)
                    router.push(`/tools?search=${encodeURIComponent(term)}`)
                    setIsSearchOpen(false)
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-cyber-background/90 backdrop-blur-sm z-[60] md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed top-0 right-0 bottom-0 w-[280px] bg-cyber-card border-l border-cyber-border z-[70] md:hidden">
            <div className="flex items-center justify-between p-4 border-b border-cyber-border">
              <span className="text-lg font-orbitron font-bold text-cyber-foreground">菜单</span>
              <button
                className="p-2 text-cyber-foreground hover:text-neon-green hover:bg-neon-green/10 clip-chamfer-sm transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="py-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 mx-2 font-mono text-sm uppercase tracking-wider clip-chamfer-sm transition-colors ${
                    isActive(item.href)
                      ? 'text-neon-green bg-neon-green/10 border border-neon-green/30'
                      : 'text-cyber-foreground hover:text-neon-green hover:bg-neon-green/5'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span className="ml-auto w-2 h-2 bg-neon-green glow-green" />
                  )}
                </Link>
              ))}
              
              {/* 移动端用户分享 - 赛博朋克高亮 */}
              <Link
                href={shareItem.href}
                className={`relative flex items-center px-4 py-3.5 mx-2 mt-3 font-mono text-sm uppercase tracking-[0.15em] overflow-hidden ${
                  isActive(shareItem.href)
                    ? 'text-cyber-background bg-neon-magenta'
                    : 'text-neon-magenta bg-neon-magenta/20'
                }`}
                style={{
                  clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                {/* 发光边框 */}
                <span className={`absolute inset-0 ${
                  isActive(shareItem.href)
                    ? 'shadow-[inset_0_0_15px_rgba(255,0,255,0.5)]'
                    : 'shadow-[inset_0_0_0_1px_rgba(255,0,255,0.8)]'
                }`} />
                
                {/* 角落装饰 */}
                <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-neon-cyan" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-neon-cyan" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-neon-cyan" />
                <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-neon-cyan" />
                
                <span className="relative flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-50" style={{ animationDuration: '1.5s' }}></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-br from-neon-cyan to-neon-magenta"></span>
                  </span>
                  <span className="font-bold">{shareItem.label}</span>
                </span>
                
                {isActive(shareItem.href) && (
                  <span className="ml-auto flex items-center gap-1 text-xs opacity-80">
                    <span className="w-1.5 h-1.5 bg-cyber-background rounded-full animate-pulse" />
                    当前
                  </span>
                )}
              </Link>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyber-border">
              <Link
                href="/submit"
                className="flex items-center justify-center gap-2 w-full py-3 btn-cyber-glow"
                onClick={() => setIsMenuOpen(false)}
              >
                <Zap className="w-5 h-5" />
                提交工具
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
