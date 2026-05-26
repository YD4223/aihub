import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/auth'

// 将 BigInt 转为 Number 的工具函数
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj)
  if (Array.isArray(obj)) return obj.map(serialize)
  if (typeof obj === 'object') {
    const result: any = {}
    for (const key of Object.keys(obj)) {
      result[key] = serialize(obj[key])
    }
    return result
  }
  return obj
}

// GET /api/admin/verify-logs - 获取验证码发送日志
export async function GET(request: NextRequest) {
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const email = searchParams.get('email') || ''
    const success = searchParams.get('success') || 'all'
    const ip = searchParams.get('ip') || ''

    const offset = (page - 1) * limit

    // 参数化构建查询条件
    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIdx = 1

    if (email) {
      conditions.push(`email LIKE $${paramIdx++}`)
      params.push(`%${email}%`)
    }

    if (success !== 'all') {
      conditions.push(`success = ${success === 'true' ? 'TRUE' : 'FALSE'}`)
      // 不注入参数 — 用 'true'/'false' 布尔值本身是安全的
    }

    if (ip) {
      conditions.push(`"ipAddress" LIKE $${paramIdx++}`)
      params.push(`%${ip}%`)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // LIMIT / OFFSET
    params.push(limit)
    const limitIdx = paramIdx++
    params.push(offset)
    const offsetIdx = paramIdx++

    // 并行查询
    const [countResult, rawLogs, rawStats] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM verification_logs ${whereClause}`,
        ...params.slice(0, -2)
      ) as Promise<any[]>,
      prisma.$queryRawUnsafe(
        `SELECT id, email, "ipAddress", "userAgent",
                to_char("sentAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "sentAt",
                success, reason
         FROM verification_logs ${whereClause}
         ORDER BY "sentAt" DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        ...params
      ) as Promise<any[]>,
      prisma.$queryRawUnsafe(
        `SELECT 
          COUNT(*) as "totalRequests",
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as "successCount",
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as "failCount",
          COUNT(DISTINCT email) as "uniqueEmails",
          COUNT(DISTINCT "ipAddress") as "uniqueIps"
         FROM verification_logs
         WHERE "sentAt" > NOW() - INTERVAL '24 hours'`
      ) as Promise<any[]>
    ])

    const total = Number(countResult[0]?.total || 0)
    const logs = serialize(rawLogs)
    const stats = rawStats[0] ? serialize(rawStats[0]) : { totalRequests: 0, successCount: 0, failCount: 0, uniqueEmails: 0, uniqueIps: 0 }

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    })
  } catch (error: any) {
    console.error('[Admin/VerifyLogs] 错误:', error)
    return NextResponse.json({ error: '获取日志失败' }, { status: 500 })
  }
}

// DELETE /api/admin/verify-logs - 删除验证码日志（支持单个或全部清空）
export async function DELETE(request: NextRequest) {
  // 鉴权
  const auth = await verifyAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const realId = parseInt(id)
      if (isNaN(realId)) {
        return NextResponse.json({ error: '无效的ID' }, { status: 400 })
      }
      await prisma.$executeRawUnsafe(`DELETE FROM verification_logs WHERE id = $1`, realId)
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM verification_logs`)
    }

    return NextResponse.json({ message: '删除成功' })
  } catch (error: any) {
    console.error('[Admin/VerifyLogs] 删除错误:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
