import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 缓存控制：5分钟CDN缓存 + 10分钟 stale-while-revalidate
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

// 获取工具趋势数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const toolId = searchParams.get('toolId')
    const days = parseInt(searchParams.get('days') || '7')
    
    if (!toolId) {
      return NextResponse.json(
        { error: '缺少 toolId 参数' },
        { status: 400 }
      )
    }
    
    // 计算日期范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // 获取趋势历史数据
    const histories = await prisma.toolTrendHistory.findMany({
      where: {
        toolId: parseInt(toolId),
        date: {
          gte: startDate.toISOString().split('T')[0],
          lte: endDate.toISOString().split('T')[0]
        }
      },
      orderBy: { date: 'asc' }
    })
    
    // 如果没有历史数据，生成模拟数据（用于演示）
    if (histories.length === 0) {
      const tool = await prisma.tool.findUnique({
        where: { id: parseInt(toolId) },
        select: { upvotes: true, viewCount: true, stars: true }
      })
      
      if (!tool) {
        return NextResponse.json(
          { error: '工具不存在' },
          { status: 404 }
        )
      }
      
      // 生成模拟历史数据
      const mockData = []
      const baseUpvotes = tool.upvotes || 100
      
      for (let i = days; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        // 模拟增长趋势（带一些随机波动）
        const growth = Math.random() * 0.3 - 0.1 // -10% 到 +20%
        const dayUpvotes = Math.floor(baseUpvotes * (1 + (days - i) * 0.05 + growth))
        
        mockData.push({
          date: date.toISOString().split('T')[0],
          upvotes: Math.max(0, dayUpvotes),
          viewCount: Math.floor(dayUpvotes * (10 + Math.random() * 5)),
          stars: tool.stars || 0
        })
      }
      
      return NextResponse.json({ data: mockData, isMock: true }, { headers: CACHE_HEADERS })
    }
    
    return NextResponse.json({ data: histories, isMock: false }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('获取趋势数据失败:', error)
    return NextResponse.json(
      { error: '获取趋势数据失败' },
      { status: 500 }
    )
  }
}

// 记录每日趋势数据（供爬虫调用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { toolId, date, upvotes, viewCount, stars, rank } = body
    
    if (!toolId || !date) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }
    
    // 创建或更新趋势记录
    const record = await prisma.toolTrendHistory.upsert({
      where: {
        toolId_date: {
          toolId: parseInt(toolId),
          date
        }
      },
      update: {
        upvotes: upvotes || 0,
        viewCount: viewCount || 0,
        stars: stars || 0,
        rank: rank || null
      },
      create: {
        toolId: parseInt(toolId),
        date,
        upvotes: upvotes || 0,
        viewCount: viewCount || 0,
        stars: stars || 0,
        rank: rank || null
      }
    })
    
    return NextResponse.json({ success: true, data: record }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('记录趋势数据失败:', error)
    return NextResponse.json(
      { error: '记录趋势数据失败' },
      { status: 500 }
    )
  }
}
