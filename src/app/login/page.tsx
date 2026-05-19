'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles, KeyRound, Zap, Github } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [githubLoading, setGithubLoading] = useState(false)
  
  // GitHub OAuth 回调检测
  React.useEffect(() => {
    // 检查 URL 错误参数
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error')
    if (oauthError) {
      const errorMap: Record<string, string> = {
        no_code: 'GitHub 授权失败：未获取到授权码',
        oauth_not_configured: 'GitHub 登录尚未配置',
        token_exchange_failed: 'GitHub token 换取失败',
        invalid_user: '获取 GitHub 用户信息失败',
        create_user_failed: '创建用户失败',
        server_error: '服务器错误，请稍后重试',
        access_denied: '你取消了 GitHub 授权',
      }
      // 如果有详细错误信息，追加显示
      const errDetail = params.get('err')
      const errText = errorMap[oauthError] || `GitHub 登录错误：${oauthError}`
      setError(errDetail ? `${errText} (${decodeURIComponent(errDetail)})` : errText)
      // 清除错误参数
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    const hash = window.location.hash
    if (hash && hash.includes('token=')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const token = params.get('token')
      const userId = params.get('userId')
      const username = params.get('username')
      if (token && userId) {
        localStorage.setItem('sessionToken', token)
        localStorage.setItem('user', JSON.stringify({
          id: parseInt(userId),
          username: decodeURIComponent(username || ''),
          sessionToken: token,
        }))
        // 清除 hash，然后跳转
        window.location.hash = ''
        router.push('/user-center')
        router.refresh()
      }
    }
  }, [router])
  
  // 验证码相关状态
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSuccess, setCodeSuccess] = useState('')

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    account: '',
    code: '',
  })

  // 发送验证码
  const handleSendCode = async () => {
    if (!formData.email) { setError('请先输入邮箱地址'); return }
    if (!formData.email.endsWith('@qq.com')) { setError('目前仅支持QQ邮箱注册'); return }

    setSendingCode(true); setError(''); setCodeSuccess('')
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || '发送失败')
      setCodeSent(true); setCodeSuccess(data.message || '验证码已发送，请查收邮件'); setCountdown(60)
    } catch (err: any) { setError(err.message) }
    finally { setSendingCode(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      let body: any
      if (isLogin) {
        const isEmail = formData.account.includes('@')
        body = { [isEmail ? 'email' : 'username']: formData.account, password: formData.password }
      } else {
        body = { username: formData.username, email: formData.email, password: formData.password, code: formData.code }
      }
      
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.sessionToken) localStorage.setItem('sessionToken', data.sessionToken)
      router.push('/user-center'); router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  // 统一样式常量
  const neonGreen = '#00ff88'
  const magenta = '#ff00ff'
  const cyan = '#00d4ff'
  const cardBg = '#12121a'
  const inputBg = '#0a0a12'
  const borderColor = '#2a2a3a'

  return (
    <>
      {/* 修复 Chrome 自动填充黄色背景 */}
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #12121a inset !important;
          -webkit-text-fill-color: #fff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      ` }} />
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px',
        background: `radial-gradient(circle, ${neonGreen}08 0%, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-8%', width: '500px', height: '500px',
        background: `radial-gradient(circle, ${magenta}08 0%, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: '440px', padding: '44px 36px',
        background: cardBg,
        borderRadius: '16px',
        border: `1px solid ${borderColor}`,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* 标题区 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* Logo */}
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', marginBottom: '18px',
            padding: '8px 16px', borderRadius: '20px',
            background: `${neonGreen}10`, border: `1px solid ${neonGreen}20`,
          }}>
            <Zap style={{ width: '16px', height: '16px', color: neonGreen }} />
            <span style={{ color: neonGreen, fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
              AI HUB
            </span>
          </div>

          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>
            {isLogin ? '欢迎回来' : '创建账号'}
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {isLogin ? '登录你的 AI 工具导航账号' : '注册开启你的 AI 探索之旅'}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            padding: '12px 16px', background: 'rgba(255,51,102,0.1)',
            border: '1px solid rgba(255,51,102,0.3)', borderRadius: '10px',
            marginBottom: '18px',
          }}>
            <p style={{ color: '#ff3366', fontSize: '13px', margin: 0 }}>⚠ {error}</p>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          {/* 用户名 - 注册时显示 */}
          {!isLogin && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#999', fontSize: '13px', marginBottom: '6px' }}>
                用户名
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#555' }} />
                <input type="text" required value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="取一个酷炫的用户名"
                  style={{
                    width: '100%', padding: '14px 14px 14px 42px',
                    backgroundColor: inputBg, border: `1px solid ${borderColor}`, borderRadius: '10px',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = neonGreen}
                  onBlur={(e) => e.currentTarget.style.borderColor = borderColor}
                />
              </div>
            </div>
          )}

          {/* 邮箱 / 账号 */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: '#999', fontSize: '13px', marginBottom: '6px' }}>
              {isLogin ? '账号' : '邮箱地址'} <span style={{ color: '#ff3366' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              {isLogin ? (
                <User style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#555' }} />
              ) : (
                <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#555' }} />
              )}
              <input type="text" required
                value={isLogin ? formData.account : formData.email}
                onChange={(e) => isLogin ? setFormData({ ...formData, account: e.target.value }) : setFormData({ ...formData, email: e.target.value })}
                placeholder={isLogin ? "输入邮箱或用户名" : "your@qq.com"}
                style={{
                  width: '100%', padding: '14px 14px 14px 42px',
                  backgroundColor: inputBg, border: `1px solid ${borderColor}`, borderRadius: '10px',
                  color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = neonGreen}
                onBlur={(e) => e.currentTarget.style.borderColor = borderColor}
              />
            </div>
          </div>

          {/* 验证码 - 注册时显示 */}
          {!isLogin && (
            <>
              {codeSuccess && (
                <div style={{
                  padding: '10px 14px', background: `${neonGreen}0a`,
                  border: `1px solid ${neonGreen}25`, borderRadius: '8px', marginBottom: '12px',
                }}>
                  <p style={{ color: neonGreen, fontSize: '13px', margin: 0 }}>✓ {codeSuccess}</p>
                </div>
              )}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#999', fontSize: '13px', marginBottom: '6px' }}>
                  邮箱验证码 <span style={{ color: '#ff3366' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <KeyRound style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#555' }} />
                    <input type="text" required value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="6位验证码" maxLength={6}
                      style={{
                        width: '100%', padding: '14px 14px 14px 42px',
                        backgroundColor: inputBg, border: `1px solid ${borderColor}`, borderRadius: '10px',
                        color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                        letterSpacing: '4px',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = neonGreen}
                      onBlur={(e) => e.currentTarget.style.borderColor = borderColor}
                    />
                  </div>
                  <button type="button" onClick={handleSendCode} disabled={countdown > 0 || sendingCode}
                    style={{
                      padding: '0 16px', whiteSpace: 'nowrap', minWidth: '112px',
                      background: countdown > 0 ? `${inputBg}` : `${neonGreen}10`,
                      border: `1px solid ${countdown > 0 ? '#333' : `${neonGreen}30`}`,
                      borderRadius: '10px', color: countdown > 0 ? '#555' : neonGreen,
                      fontSize: '13px', fontWeight: 500, cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 密码 */}
          <div style={{ marginBottom: isLogin ? '18px' : '14px' }}>
            <label style={{ display: 'block', color: '#999', fontSize: '13px', marginBottom: '6px' }}>
              密码 <span style={{ color: '#ff3366' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#555' }} />
              <input type={showPassword ? 'text' : 'password'} required value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isLogin ? "输入密码" : "至少6位密码"}
                style={{
                  width: '100%', padding: '14px 44px 14px 42px',
                  backgroundColor: inputBg, border: `1px solid ${borderColor}`, borderRadius: '10px',
                  color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = neonGreen}
                onBlur={(e) => e.currentTarget.style.borderColor = borderColor}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? (
                  <EyeOff style={{ width: '18px', height: '18px', color: '#555' }} />
                ) : (
                  <Eye style={{ width: '18px', height: '18px', color: '#555' }} />
                )}
              </button>
            </div>
          </div>

          {/* 记住我 / 忘记密码 - 登录时显示 */}
          {isLogin && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '24px', fontSize: '13px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#888' }}>
                <input type="checkbox" style={{ accentColor: neonGreen, width: '16px', height: '16px' }} />
                <span>记住登录状态</span>
              </label>
              <Link href="/forgot-password" style={{ color: neonGreen, textDecoration: 'none', fontSize: '13px' }}>
                忘记密码？
              </Link>
            </div>
          )}

          {/* 提交按钮 */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '15px',
              background: loading
                ? '#333'
                : `linear-gradient(135deg, ${neonGreen} 0%, #00cc6a 100%)`,
              border: 'none', borderRadius: '10px',
              color: '#000', fontSize: '15px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : `0 0 20px ${neonGreen}25`,
            }}
          >
            {loading ? (
              <span>处理中...</span>
            ) : (
              <>
                {isLogin ? '登 录' : '注 册'}
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </>
            )}
          </button>
        </form>

        {/* 切换登录/注册 */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {isLogin ? '还没有账号？' : '已有账号？'}
            <button type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); setCodeSuccess('') }}
              style={{
                background: 'none', border: 'none',
                color: neonGreen, fontWeight: 600, cursor: 'pointer', marginLeft: '4px',
                fontSize: '14px',
              }}
            >
              {isLogin ? '立即注册' : '去登录'}
            </button>
          </p>
        </div>

        {/* 分割线 */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '14px' }}>
          <div style={{ flex: 1, height: '1px', background: `${borderColor}` }} />
          <span style={{ color: '#555', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: `${borderColor}` }} />
        </div>

        {/* GitHub 登录 */}
        <a href="/api/auth/github" onClick={() => setGithubLoading(true)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '13px', marginBottom: '14px',
          border: `1px solid ${borderColor}`, borderRadius: '10px',
          color: '#ccc', textDecoration: 'none', fontSize: '14px', fontWeight: 500,
          transition: 'all 0.2s',
          opacity: githubLoading ? 0.6 : 1,
          cursor: githubLoading ? 'not-allowed' : 'pointer',
        }}>
          <Github style={{ width: '18px', height: '18px' }} />
          {githubLoading ? '跳转到 GitHub 授权...' : '通过 GitHub 登录'}
        </a>

        {/* 游客访问 */}
        <Link href="/" style={{
          display: 'block', textAlign: 'center', padding: '13px',
          border: `1px solid ${borderColor}`, borderRadius: '10px',
          color: '#888', textDecoration: 'none', fontSize: '14px',
          transition: 'all 0.2s',
        }}>
          ← 返回首页浏览工具
        </Link>

        {/* 注册提示 */}
        {!isLogin && (
          <div style={{
            marginTop: '20px', padding: '14px',
            background: `${magenta}08`, border: `1px solid ${magenta}15`,
            borderRadius: '10px',
          }}>
            <p style={{ color: '#aaa', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
              🔒 注册即表示你同意我们的服务条款。我们会通过邮箱验证来保障账号安全，不会向第三方泄露你的信息。
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
