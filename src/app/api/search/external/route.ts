import { NextRequest, NextResponse } from 'next/server'

// GET /api/search/external?q=搜索词
// 代理 DuckDuckGo 即时答案 API（免费、无需API Key）
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7000)

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q.trim())}&format=json&no_html=1&skip_disambig=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIHub/1.0; +https://ai999999.top)' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ error: '搜索失败' }, { status: 502 })
    }

    const data = await res.json()

    const result: any = {
      query: q.trim(),
    }

    if (data.AbstractText) {
      result.abstract = {
        title: data.Heading || q.trim(),
        text: data.AbstractText,
        source: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL || '',
        image: data.Image || null,
      }
    }

    if (data.Results && data.Results.length > 0) {
      result.results = data.Results.slice(0, 5).map((r: any) => ({
        title: r.Text || r.FirstURL,
        url: r.FirstURL,
        text: null,
      }))
    }

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      result.related = data.RelatedTopics.slice(0, 8).map((r: any) => {
        if (r.Text) return { text: r.Text, url: r.FirstURL }
        if (r.Topics) return r.Topics.slice(0, 3).map((t: any) => ({ text: t.Text, url: t.FirstURL }))
        return null
      }).flat().filter(Boolean)
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' }
    })
  } catch (error: any) {
    console.error('外部搜索失败:', error.message)
    return NextResponse.json({ error: '搜索服务暂时不可用' }, { status: 500 })
  }
}
