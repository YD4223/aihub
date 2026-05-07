import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// POST /api/auth/refresh-token - 获取或生成 sessionToken
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: '需要userId' }, { status: 400 })

    // 先查有没有已有的 token
    const result = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT "sessionToken" FROM users WHERE id = $1`,
      parseInt(userId)
    )

    if (Array.isArray(result) && result.length > 0 && result[0].sessionToken) {
      // 已有 token，直接返回（不要替换）
      return NextResponse.json({ sessionToken: result[0].sessionToken })
    }

    // 没有 token 才生成新的
    const sessionToken = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "sessionToken" = $1 WHERE id = $2`,
      sessionToken, parseInt(userId)
    )

    return NextResponse.json({ sessionToken })
  } catch (error: any) {
    console.error('[RefreshToken] 错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
