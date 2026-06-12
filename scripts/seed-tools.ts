import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'AI对话', slug: 'chat', icon: 'MessageSquare', sortOrder: 1 },
  { name: 'AI绘画', slug: 'image', icon: 'Image', sortOrder: 2 },
  { name: 'AI写作', slug: 'writing', icon: 'PenTool', sortOrder: 3 },
  { name: 'AI编程', slug: 'coding', icon: 'Code', sortOrder: 4 },
  { name: 'AI视频', slug: 'video', icon: 'Video', sortOrder: 5 },
  { name: 'AI音频', slug: 'audio', icon: 'Music', sortOrder: 6 },
  { name: '生产力', slug: 'productivity', icon: 'Zap', sortOrder: 7 },
  { name: 'AI搜索', slug: 'search', icon: 'Search', sortOrder: 8 },
];

const tools = [
  // AI对话
  {
    name: 'ChatGPT',
    slug: 'chatgpt',
    description: 'OpenAI开发的AI对话模型，支持文本生成、代码编写、问答等多种任务',
    url: 'https://chat.openai.com',
    categoryId: 'chat',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Claude',
    slug: 'claude',
    description: 'Anthropic开发的AI助手，以安全性和长文本处理能力著称',
    url: 'https://claude.ai',
    categoryId: 'chat',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Gemini',
    slug: 'gemini',
    description: 'Google开发的AI模型，支持多模态理解和长上下文',
    url: 'https://gemini.google.com',
    categoryId: 'chat',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Kimi',
    slug: 'kimi',
    description: '月之暗面开发的AI助手，支持超长文本处理',
    url: 'https://kimi.moonshot.cn',
    categoryId: 'chat',
    pricing: 'FREE',
    source: 'crawler',
  },
  {
    name: '文心一言',
    slug: 'wenxin',
    description: '百度开发的AI对话产品，针对中文优化',
    url: 'https://yiyan.baidu.com',
    categoryId: 'chat',
    pricing: 'FREE',
    source: 'crawler',
  },
  // AI绘画
  {
    name: 'Midjourney',
    slug: 'midjourney',
    description: '业界领先的AI图像生成工具，以艺术风格著称',
    url: 'https://www.midjourney.com',
    categoryId: 'image',
    pricing: 'PAID',
    source: 'crawler',
  },
  {
    name: 'Stable Diffusion',
    slug: 'stable-diffusion',
    description: '开源AI图像生成模型，可本地部署',
    url: 'https://stability.ai',
    categoryId: 'image',
    pricing: 'FREE',
    source: 'crawler',
  },
  {
    name: 'DALL·E 3',
    slug: 'dalle-3',
    description: 'OpenAI的图像生成模型，集成在ChatGPT中',
    url: 'https://openai.com/dall-e-3',
    categoryId: 'image',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Leonardo.ai',
    slug: 'leonardo',
    description: '游戏资产和概念设计专用的AI绘画工具',
    url: 'https://leonardo.ai',
    categoryId: 'image',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  // AI写作
  {
    name: 'Jasper',
    slug: 'jasper',
    description: '企业级AI写作助手，专注于营销文案',
    url: 'https://www.jasper.ai',
    categoryId: 'writing',
    pricing: 'PAID',
    source: 'crawler',
  },
  {
    name: 'Notion AI',
    slug: 'notion-ai',
    description: '集成在Notion中的AI写作助手',
    url: 'https://www.notion.so/product/ai',
    categoryId: 'writing',
    pricing: 'PAID',
    source: 'crawler',
  },
  {
    name: 'Copy.ai',
    slug: 'copy-ai',
    description: '营销文案和社交媒体内容生成工具',
    url: 'https://www.copy.ai',
    categoryId: 'writing',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  // AI编程
  {
    name: 'GitHub Copilot',
    slug: 'github-copilot',
    description: 'GitHub和OpenAI合作的AI编程助手',
    url: 'https://github.com/features/copilot',
    categoryId: 'coding',
    pricing: 'PAID',
    source: 'crawler',
  },
  {
    name: 'Cursor',
    slug: 'cursor',
    description: '基于VS Code的AI代码编辑器',
    url: 'https://cursor.sh',
    categoryId: 'coding',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Codeium',
    slug: 'codeium',
    description: '免费的AI代码补全工具',
    url: 'https://codeium.com',
    categoryId: 'coding',
    pricing: 'FREE',
    source: 'crawler',
  },
  {
    name: '通义灵码',
    slug: 'tongyi-lingma',
    description: '阿里云推出的AI编程助手',
    url: 'https://tongyi.aliyun.com/lingma',
    categoryId: 'coding',
    pricing: 'FREE',
    source: 'crawler',
  },
  // AI视频
  {
    name: 'Runway',
    slug: 'runway',
    description: 'AI视频生成和编辑平台',
    url: 'https://runwayml.com',
    categoryId: 'video',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Pika',
    slug: 'pika',
    description: 'AI视频生成工具，支持文本/图像转视频',
    url: 'https://pika.art',
    categoryId: 'video',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'HeyGen',
    slug: 'heygen',
    description: 'AI数字人视频生成平台',
    url: 'https://www.heygen.com',
    categoryId: 'video',
    pricing: 'PAID',
    source: 'crawler',
  },
  // AI音频
  {
    name: 'ElevenLabs',
    slug: 'elevenlabs',
    description: 'AI语音合成和克隆工具',
    url: 'https://elevenlabs.io',
    categoryId: 'audio',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Suno',
    slug: 'suno',
    description: 'AI音乐生成工具',
    url: 'https://suno.ai',
    categoryId: 'audio',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Udio',
    slug: 'udio',
    description: 'AI音乐创作平台',
    url: 'https://www.udio.com',
    categoryId: 'audio',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  // 生产力
  {
    name: 'Gamma',
    slug: 'gamma',
    description: 'AI演示文稿生成工具',
    url: 'https://gamma.app',
    categoryId: 'productivity',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Perplexity',
    slug: 'perplexity',
    description: 'AI搜索引擎，提供带来源的问答',
    url: 'https://www.perplexity.ai',
    categoryId: 'search',
    pricing: 'FREE',
    source: 'crawler',
  },
  {
    name: 'Otter.ai',
    slug: 'otter',
    description: 'AI会议记录和转录工具',
    url: 'https://otter.ai',
    categoryId: 'productivity',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
  {
    name: 'Remio',
    slug: 'remio',
    description: '本地优先 AI 记忆与知识库客户端，解析文件、网页、录音、邮件、消息和图片，并通过本地索引与向量帮助用户和 agent 快速检索个人上下文',
    url: 'https://remio.ai/',
    categoryId: 'productivity',
    pricing: 'FREEMIUM',
    source: 'crawler',
  },
];

async function main() {
  console.log('开始初始化分类数据...');
  
  for (const category of categories) {
    await (prisma as any).category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    console.log(`✓ 分类: ${category.name}`);
  }

  console.log('\n开始初始化工具数据...');
  
  for (const tool of tools) {
    await (prisma as any).tool.upsert({
      where: { slug: tool.slug },
      update: tool,
      create: tool,
    });
    console.log(`✓ 工具: ${tool.name}`);
  }

  console.log('\n工具数据初始化完成！');
  console.log(`- ${categories.length} 个分类`);
  console.log(`- ${tools.length} 个工具`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
