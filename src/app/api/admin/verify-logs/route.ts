import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const email = searchParams.get('email') || ''
    const success = searchParams.get('success') || 'all' // all / true / false
    const ip = searchParams.get('ip') || ''

    const offset = (page - 1) * limit

    // 构建查询条件
    const conditions: string[] = []

    if (email) {
      conditions.push(`email LIKE '%${email}%'`)
    }

    if (success !== 'all') {
      conditions.push(`success = ${success === 'true' ? 'true' : 'false'}`)
    }

    if (ip) {
      conditions.push(`"ipAddress" LIKE '%${ip}%'`)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询总数
    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM verification_logs ${whereClause}`
    ) as any[]
    const total = Number(countResult[0]?.total || 0)

    // 查询数据
    const rawLogs = await prisma.$queryRawUnsafe(
      `SELECT id, email, "ipAddress", "userAgent",
              to_char("sentAt", 'YYYY-MM-DD"T"HH24:MI:SS') as "sentAt",
              success, reason
       FROM verification_logs ${whereClause}
       ORDER BY "sentAt" DESC
       LIMIT ${limit} OFFSET ${offset}`
    ) as any[]
    const logs = serialize(rawLogs)

    // 统计概览
    const rawStats = await prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(*) as "totalRequests",
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as "successCount",
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as "failCount",
        COUNT(DISTINCT email) as "uniqueEmails",
        COUNT(DISTINCT "ipAddress") as "uniqueIps"
       FROM verification_logs
       WHERE "sentAt" > NOW() - INTERVAL '24 hours'`
    ) as any[]
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
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // 删除单条
      await prisma.$executeRawUnsafe(`DELETE FROM verification_logs WHERE id = $1`, parseInt(id))
    } else {
      // 清空全部
      await prisma.$executeRawUnsafe(`DELETE FROM verification_logs`)
    }

    return NextResponse.json({ message: '删除成功' })
  } catch (error: any) {
    console.error('[Admin/VerifyLogs] 删除错误:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
