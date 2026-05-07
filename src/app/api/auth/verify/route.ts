import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/verify?userId=xxx&token=xxx - 校验 sessionToken 是否有效
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const token = searchParams.get('token')

    if (!userId || !token) {
      return NextResponse.json({ valid: false, error: '参数不完整' }, { status: 400 })
    }

    const result = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT "sessionToken" FROM users WHERE id = $1`,
      parseInt(userId)
    )

    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ valid: false, error: '用户不存在' }, { status: 401 })
    }

    const storedToken = result[0].sessionToken

    if (!storedToken) {
      return NextResponse.json({ valid: false, error: '未登录' }, { status: 401 })
    }

    if (storedToken !== token) {
      return NextResponse.json({ valid: false, error: '账号在其他设备登录' }, { status: 401 })
    }

    return NextResponse.json({ valid: true })
  } catch (error: any) {
    console.error('[Verify] 错误:', error)
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 })
  }
}
