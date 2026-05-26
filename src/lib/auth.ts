/**
 * 认证辅助模块
 * 提供 admin 路由的 session token 鉴权
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface AuthResult {
  userId: number
  isAdmin: boolean
}

/**
 * 从请求中提取并验证 session token
 * 检查用户是否为 ADMIN 角色
 *
 * 鉴权方式：
 * 1. 优先从 auth_token cookie 提取 token，查找对应用户
 * 2. 如果前端传了 x-user-id header，做二次校验（兼容旧方式）
 * 3. 都失败则返回 401
 */
export async function verifyAdmin(request: NextRequest): Promise<AuthResult | NextResponse> {
  try {
    // 从 cookie 中获取 token
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 方案一：通过 x-user-id header 定位用户（旧方式，前端需要主动发）
    const userIdStr = request.headers.get('x-user-id')
    if (userIdStr) {
      const userId = parseInt(userIdStr)
      if (!isNaN(userId)) {
        const result = await prisma.$queryRawUnsafe<Array<any>>(
          `SELECT "sessionToken", role FROM users WHERE id = $1`,
          userId
        )
        if (Array.isArray(result) && result.length > 0) {
          const user = result[0]
          if (user.sessionToken === token) {
            if (user.role !== 'ADMIN') {
              return NextResponse.json({ error: '无权限，仅管理员可操作' }, { status: 403 })
            }
            return { userId, isAdmin: true }
          }
        }
      }
    }

    // 方案二：直接通过 sessionToken 查数据库（推荐，cookie 自动发送无需前端配合）
    const userResult = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id, role FROM users WHERE "sessionToken" = $1 AND role = 'ADMIN'`,
      token
    )

    if (Array.isArray(userResult) && userResult.length > 0) {
      const admin = userResult[0]
      return { userId: admin.id, isAdmin: true }
    }

    // 尝试不限制 role 再查一次（区分是 token 无效还是权限不足）
    const anyUser = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id, role FROM users WHERE "sessionToken" = $1`,
      token
    )

    if (Array.isArray(anyUser) && anyUser.length > 0) {
      return NextResponse.json({ error: '无权限，仅管理员可操作' }, { status: 403 })
    }

    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  } catch (error: any) {
    console.error('[Auth] 鉴权失败:', error)
    return NextResponse.json({ error: '鉴权失败' }, { status: 500 })
  }
}
