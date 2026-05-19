import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'}/login?error=${error || 'no_code'}`
      )
    }

    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'}/api/auth/github/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'}/login?error=oauth_not_configured`
      )
    }

    // 1. 用 code 换取 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('GitHub OAuth token exchange failed:', tokenData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'}/login?error=token_exchange_failed`
      )
    }

    // 2. 获取 GitHub 用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const githubUser = await userRes.json()

    if (!githubUser.id) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'}/login?error=invalid_user`
      )
    }

    const githubId = String(githubUser.id)

    // 3. 尝试获取 GitHub 主邮箱
    let email = githubUser.email || ''
    if (!email) {
      try {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const emails = await emailRes.json()
        const primary = Array.isArray(emails) ? emails.find((e: any) => e.primary && e.verified) : null
        if (primary) email = primary.email
      } catch (e) {
        // 静默失败，邮箱不是必须的
      }
    }

    // 4. 查找或创建用户
    let user = await prisma.user.findUnique({ where: { githubId } })

    if (user) {
      // GitHub 账号已绑定 -> 直接登录
      // 更新 GitHub 用户名（可能改了）
      if (githubUser.login !== user.githubUsername) {
        await prisma.$executeRawUnsafe(
          `UPDATE users SET "githubUsername" = $1 WHERE id = $2`,
          githubUser.login, user.id
        )
      }
    } else {
      // 尝试通过邮箱匹配已有账号
      if (email) {
        user = await prisma.user.findUnique({ where: { email } })
      }

      if (user) {
        // 已有邮箱账号 -> 绑定 GitHub
        await prisma.$executeRawUnsafe(
          `UPDATE users SET "githubId" = $1, "githubUsername" = $2 WHERE id = $3`,
          githubId, githubUser.login, user.id
        )
      } else {
        // 全新用户 -> 创建账号（无需密码）
        const username = await generateUniqueUsername(githubUser.login)

        await prisma.$executeRawUnsafe(
          `INSERT INTO users (username, email, "githubId", "githubUsername", "avatarUrl", password, role, status)
           VALUES ($1, $2, $3, $4, $5, '', 'USER', 'active')`,
          username, email || `gh_${githubId}@github.local`, githubId, githubUser.login, githubUser.avatar_url
        )

        user = await prisma.user.findUnique({ where: { githubId } })
      }
    }

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'}/login?error=create_user_failed`
      )
    }

    // 5. 生成 sessionToken & 设置 cookie
    const sessionToken = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "sessionToken" = $1 WHERE id = $2`,
      sessionToken, user.id
    )

    // 6. 重定向回前端，带上 sessionToken（URL hash 方式，避免服务端日志记录）
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'
    const redirectUrl = new URL(`${appUrl}/login`)
    redirectUrl.searchParams.set('github_oauth', 'success')
    redirectUrl.hash = `token=${sessionToken}&userId=${user.id}&username=${encodeURIComponent(user.username)}`

    const res = NextResponse.redirect(redirectUrl.toString())

    res.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return res
  } catch (err) {
    console.error('GitHub OAuth callback error:', err)
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai999999.top'}/login?error=server_error&err=${encodeURIComponent(errMsg.slice(0, 200))}`
    )
  }
}

/**
 * 生成唯一用户名（GitHub 用户名 + 后缀去重）
 */
async function generateUniqueUsername(base: string): Promise<string> {
  let username = base.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30)
  if (!username) username = 'github_user'

  const existing = await prisma.user.findUnique({ where: { username } })
  if (!existing) return username

  // 加随机后缀
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).substring(2, 6)
    const candidate = `${username}_${suffix}`
    const exists = await prisma.user.findUnique({ where: { username: candidate } })
    if (!exists) return candidate
  }

  // 最终兜底
  return `${username}_${Date.now().toString(36)}`
}
