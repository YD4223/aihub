/**
 * 工具自动分类工具函数
 * 根据工具的名称、描述、标签匹配最佳分类
 */

import { prisma } from '@/lib/prisma'

interface ToolInfo {
  name: string
  description?: string | null
  tags?: string | string[] | null
}

// 分类关键词映射（按优先级排序）
const categoryKeywords: Record<string, { name: string; keywords: string[]; weight: number }[]> = {
  '聊天对话': [
    { name: '聊天对话', keywords: ['chat', '聊天', '对话', 'assistant', 'bot', 'gpt', 'claude', 'chatbot', 'conversation', 'ai助手', '大模型'], weight: 2 },
    { name: '聊天对话', keywords: ['问答', 'q&a', '客服', 'customer-service', '对话式'], weight: 1 },
  ],
  '图像生成': [
    { name: '图像生成', keywords: ['image', '图片', '绘画', 'draw', 'art', 'stable-diffusion', 'midjourney', 'dall-e', '图像', '生成图片', 'ai绘画'], weight: 2 },
    { name: '图像生成', keywords: ['photo', '照片', '画图', 'illustration', '插图', 'svg', 'icon', '图标'], weight: 1 },
  ],
  '视频生成': [
    { name: '视频生成', keywords: ['video', '视频', 'animation', 'sora', 'runway', '视频生成', '短视频', 'video-generation'], weight: 2 },
    { name: '视频生成', keywords: ['剪辑', 'edit', 'movie', '电影', '影视'], weight: 1 },
  ],
  '音频处理': [
    { name: '音频处理', keywords: ['audio', '语音', 'music', 'sound', 'tts', 'voice', 'whisper', '音频', '音乐', '配音', 'speech'], weight: 2 },
    { name: '音频处理', keywords: ['播客', 'podcast', '转文字', 'transcribe'], weight: 1 },
  ],
  '写作助手': [
    { name: '写作助手', keywords: ['write', '写作', 'markdown', 'doc', 'copywriting', 'blog', '文章', '文案', '内容创作'], weight: 2 },
    { name: '写作助手', keywords: ['大纲', 'outline', '作文', 'essay', '论文', 'thesis'], weight: 1 },
  ],
  '代码助手': [
    { name: '代码助手', keywords: ['code', 'coding', '编程', 'developer', 'ide', 'copilot', 'framework', 'api', 'llm', '机器学习'], weight: 2 },
    { name: '代码助手', keywords: ['deploy', '部署', 'devops', 'git', 'github', 'pipeline', 'ci/cd', 'terminal', 'cli', 'agent'], weight: 1 },
  ],
  '搜索引擎': [
    { name: '搜索引擎', keywords: ['search', '搜索', '搜索引擎', 'perplexity', '检索', 'rag'], weight: 2 },
    { name: '搜索引擎', keywords: ['browser', '浏览器', 'web', '网页'], weight: 1 },
  ],
  '办公效率': [
    { name: '办公效率', keywords: ['productivity', '办公', 'excel', 'pdf', 'automation', 'workflow', '自动化', '效率'], weight: 2 },
    { name: '办公效率', keywords: ['schedule', '日历', '会议', 'meeting', 'project', '项目', 'task', '任务'], weight: 1 },
  ],
  '设计工具': [
    { name: '设计工具', keywords: ['design', '设计', 'ui', 'ux', 'figma', 'prototype', '原型'], weight: 2 },
    { name: '设计工具', keywords: ['配色', 'color', '字体', 'font', 'landing', 'landing-page', '模板', 'template'], weight: 1 },
  ],
  '知识管理': [
    { name: '知识管理', keywords: ['knowledge', '笔记', 'wiki', 'bookmark', 'notion', '知识', 'obsidian'], weight: 2 },
    { name: '知识管理', keywords: ['文档', 'documentation', '收藏', '收集'], weight: 1 },
  ],
  '翻译工具': [
    { name: '翻译工具', keywords: ['translation', '翻译', 'translate', 'locale', 'i18n', 'l10n', '多语言'], weight: 2 },
  ],
  '数据分析': [
    { name: '数据分析', keywords: ['data', '数据', 'analytics', 'chart', 'visualization', 'bi', 'dashboard'], weight: 2 },
    { name: '数据分析', keywords: ['sql', 'database', '数据库', '报表', 'report'], weight: 1 },
  ],
  '教育学习': [
    { name: '教育学习', keywords: ['education', '学习', 'course', 'tutorial', 'learn', '课程', '教程', '面试'], weight: 2 },
    { name: '教育学习', keywords: ['培训', 'training', '教学', 'teaching', 'exam', '考试'], weight: 1 },
  ],
  '健康医疗': [
    { name: '健康医疗', keywords: ['health', '医疗', 'medical', 'fitness', '健康', '健身', 'wellness'], weight: 2 },
    { name: '健康医疗', keywords: ['心理', 'mental', '营养', 'nutrition', '睡眠', 'sleep'], weight: 1 },
  ],
  '金融理财': [
    { name: '金融理财', keywords: ['finance', '金融', 'trading', 'crypto', 'investment', '投资', '股票', 'cryptocurrency'], weight: 2 },
    { name: '金融理财', keywords: ['银行', 'bank', '支付', 'payment', 'invoice', '发票', '记账'], weight: 1 },
  ],
}

/**
 * 根据工具信息自动匹配分类
 * @returns 分类ID（未匹配到返回 其他工具 的ID）
 */
export async function autoCategorize(tool: ToolInfo): Promise<number | null> {
  const text = [
    tool.name || '',
    tool.description || '',
    // tags 可能是数组、逗号分隔字符串或 null
    Array.isArray(tool.tags) ? tool.tags.join(' ') : (tool.tags || ''),
  ].join(' ').toLowerCase()

  let bestCategory: string | null = null
  let bestScore = 0

  for (const [categoryName, rules] of Object.entries(categoryKeywords)) {
    let score = 0
    for (const rule of rules) {
      for (const keyword of rule.keywords) {
        if (text.includes(keyword)) {
          score += rule.weight
          // name 中匹配到权重翻倍
          if ((tool.name || '').toLowerCase().includes(keyword)) {
            score += rule.weight
          }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = categoryName
    }
  }

  // 得分太低的不要（至少得匹配到一个标签）
  if (!bestCategory || bestScore === 0) {
    return await getOtherCategoryId()
  }

  // 防止边角情况：如果最高分和次高分差距很小(<2),交给人工
  const sorted = Object.entries(categoryKeywords)
    .map(([name, rules]) => {
      let s = 0
      for (const rule of rules) {
        for (const keyword of rule.keywords) {
          if (text.includes(keyword)) s += rule.weight
          if ((tool.name || '').toLowerCase().includes(keyword)) s += rule.weight
        }
      }
      return { name, score: s }
    })
    .sort((a, b) => b.score - a.score)

  if (sorted.length >= 2 && sorted[0].score > 0 && sorted[0].score - sorted[1].score < 2) {
    // 得分接近，取匹配更多不同关键词的
    // 这里简化处理：保持最高分
  }

  const category = await prisma.category.findFirst({
    where: { name: bestCategory }
  })

  return category?.id || await getOtherCategoryId()
}

let _otherCategoryId: number | null = null

async function getOtherCategoryId(): Promise<number | null> {
  if (_otherCategoryId) return _otherCategoryId
  const other = await prisma.category.findFirst({ where: { name: '其他工具' } })
  _otherCategoryId = other?.id || null
  return _otherCategoryId
}
