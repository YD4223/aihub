import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Product Hunt GraphQL API
const PRODUCT_HUNT_API = 'https://www.producthunt.com/frontend/graphql'

// 获取今日热门产品
async function fetchProductHunt() {
  console.log('🚀 开始抓取 Product Hunt 数据...')
  
  try {
    const query = `
      query {
        posts(first: 20, featured: true) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              website
              thumbnail {
                url
              }
              votesCount
              commentsCount
              topics {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `
    
    const response = await fetch(PRODUCT_HUNT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      console.log('⚠️ Product Hunt API 限制，使用备用方案...')
      return []
    }

    const data = await response.json()
    return data.data?.posts?.edges || []
  } catch (error) {
    console.error('❌ Product Hunt 抓取失败:', error)
    return []
  }
}

// 获取 GitHub Trending
async function fetchGitHubTrending() {
  console.log('🚀 开始抓取 GitHub Trending...')
  
  try {
    // 使用 GitHub API 搜索热门仓库
    const response = await fetch(
      'https://api.github.com/search/repositories?q=stars:>1000+language:typescript+AI+OR+ML+OR+chatbot&sort=stars&order=desc&per_page=20',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Hub-Crawler',
        },
      }
    )

    if (!response.ok) {
      console.log('⚠️ GitHub API 限制')
      return []
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('❌ GitHub 抓取失败:', error)
    return []
  }
}

// 保存工具到数据库
async function saveTool(toolData: any) {
  const slug = toolData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  try {
    await prisma.tool.upsert({
      where: { slug },
      update: {
        name: toolData.name,
        shortDesc: toolData.tagline || toolData.description?.substring(0, 200),
        description: toolData.description,
        websiteUrl: toolData.html_url ? (toolData.website || toolData.html_url) : (toolData.website || toolData.url),
        githubUrl: toolData.html_url,
        logoUrl: toolData.thumbnail?.url || toolData.owner?.avatar_url,
        stars: toolData.votesCount || toolData.stargazers_count || 0,
        upvotes: toolData.votesCount || 0,
        tags: toolData.topics?.edges?.map((e: any) => e.node.name).join(',') || 
              toolData.topics?.join(',') || '',
        source: toolData.html_url ? 'github' : 'producthunt',
        sourceUrl: toolData.url || toolData.html_url,
        updatedAt: new Date(),
      },
      create: {
        name: toolData.name,
        slug,
        shortDesc: toolData.tagline || toolData.description?.substring(0, 200),
        description: toolData.description,
        websiteUrl: toolData.html_url ? (toolData.website || toolData.html_url) : (toolData.website || toolData.url),
        githubUrl: toolData.html_url,
        logoUrl: toolData.thumbnail?.url || toolData.owner?.avatar_url,
        stars: toolData.votesCount || toolData.stargazers_count || 0,
        upvotes: toolData.votesCount || 0,
        tags: toolData.topics?.edges?.map((e: any) => e.node.name).join(',') || 
              toolData.topics?.join(',') || '',
        pricingType: 'FREEMIUM',
        source: toolData.html_url ? 'github' : 'producthunt',
        sourceUrl: toolData.url || toolData.html_url,
        isActive: true,
        publishedAt: new Date(),
      },
    })
    console.log(`✅ 已保存: ${toolData.name}`)
  } catch (error) {
    console.error(`❌ 保存失败 ${toolData.name}:`, error)
  }
}

// 主函数
async function main() {
  console.log('🤖 AI Hub 数据爬虫启动')
  console.log('========================')
  
  // 抓取 Product Hunt
  const phProducts = await fetchProductHunt()
  console.log(`📦 获取到 ${phProducts.length} 个 Product Hunt 产品`)
  
  for (const edge of phProducts) {
    await saveTool(edge.node)
  }
  
  // 抓取 GitHub
  const ghRepos = await fetchGitHubTrending()
  console.log(`📦 获取到 ${ghRepos.length} 个 GitHub 仓库`)
  
  for (const repo of ghRepos) {
    await saveTool(repo)
  }
  
  console.log('========================')
  console.log('✨ 爬虫执行完成')
  
  // 统计
  const count = await prisma.tool.count()
  console.log(`📊 数据库中共有 ${count} 个工具`)

  // 更新今日趋势数据
  console.log('\n📈 更新今日趋势数据...')
  const today = new Date().toISOString().split('T')[0]
  const allTools = await prisma.tool.findMany({
    where: { isActive: true },
    orderBy: { upvotes: 'desc' },
    select: { id: true, upvotes: true, viewCount: true, stars: true }
  })
  for (let i = 0; i < allTools.length; i++) {
    const tool = allTools[i]
    await prisma.$executeRawUnsafe(
      `INSERT INTO tool_trend_histories (toolId, date, upvotes, viewCount, stars, rank, createdAt, updatedAt)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT(toolId, date) DO UPDATE SET
         upvotes = EXCLUDED.upvotes,
         viewCount = EXCLUDED.viewCount,
         stars = EXCLUDED.stars,
         rank = EXCLUDED.rank,
         updatedAt = NOW()`,
      tool.id, today, tool.upvotes, tool.viewCount, tool.stars, i + 1
    )
  }
  console.log(`✅ 已更新 ${allTools.length} 个工具的今日趋势数据`)
  
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
