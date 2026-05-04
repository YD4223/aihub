import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// AI工具数据源 - 批量抓取
const dataSources = [
  // Product Hunt 热门 AI 工具
  {
    name: 'Product Hunt AI',
    url: 'https://www.producthunt.com/topics/artificial-intelligence',
    type: 'producthunt'
  },
  // GitHub  trending AI repos
  {
    name: 'GitHub AI',
    url: 'https://github.com/trending?since=daily&spoken_language_code=en',
    type: 'github'
  },
  // 知名 AI 工具列表（手动维护的核心列表）
  {
    name: 'Core AI Tools',
    type: 'manual',
    tools: [
      // AI 聊天
      { name: 'Gemini', slug: 'gemini', shortDesc: 'Google 开发的 AI 助手', websiteUrl: 'https://gemini.google.com', pricingType: 'FREEMIUM', tags: '聊天,AI助手,Google', category: 'chat' },
      { name: '文心一言', slug: 'wenxin-yiyan', shortDesc: '百度推出的 AI 对话产品', websiteUrl: 'https://yiyan.baidu.com', pricingType: 'FREEMIUM', tags: '聊天,AI助手,百度,中文', category: 'chat' },
      { name: '通义千问', slug: 'tongyi-qianwen', shortDesc: '阿里云大语言模型', websiteUrl: 'https://tongyi.aliyun.com', pricingType: 'FREEMIUM', tags: '聊天,AI助手,阿里,中文', category: 'chat' },
      { name: 'Kimi', slug: 'kimi', shortDesc: '月之暗面推出的 AI 助手，支持超长文本', websiteUrl: 'https://kimi.moonshot.cn', pricingType: 'FREEMIUM', tags: '聊天,长文本,AI助手,中文', category: 'chat' },
      { name: '智谱清言', slug: 'zhipu-qingyan', shortDesc: '智谱 AI 推出的对话助手', websiteUrl: 'https://chatglm.cn', pricingType: 'FREEMIUM', tags: '聊天,AI助手,中文', category: 'chat' },
      
      // AI 图像
      { name: 'Stable Diffusion WebUI', slug: 'sd-webui', shortDesc: 'Stable Diffusion 可视化界面', websiteUrl: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui', githubUrl: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,WebUI', category: 'image' },
      { name: 'ComfyUI', slug: 'comfyui', shortDesc: '基于节点的工作流图像生成工具', websiteUrl: 'https://github.com/comfyanonymous/ComfyUI', githubUrl: 'https://github.com/comfyanonymous/ComfyUI', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,工作流', category: 'image' },
      { name: 'Leonardo.ai', slug: 'leonardo-ai', shortDesc: 'AI 图像生成平台，专注游戏资产', websiteUrl: 'https://leonardo.ai', pricingType: 'FREEMIUM', tags: '图像生成,游戏,设计', category: 'image' },
      { name: 'Playground AI', slug: 'playground-ai', shortDesc: '免费 AI 图像生成工具', websiteUrl: 'https://playgroundai.com', pricingType: 'FREEMIUM', tags: '图像生成,设计', category: 'image' },
      { name: 'Remove.bg', slug: 'remove-bg', shortDesc: 'AI 自动抠图工具', websiteUrl: 'https://www.remove.bg', pricingType: 'FREEMIUM', tags: '图像处理,抠图,背景移除', category: 'image' },
      { name: 'Upscayl', slug: 'upscayl', shortDesc: 'AI 图像放大增强工具', websiteUrl: 'https://upscayl.org', githubUrl: 'https://github.com/upscayl/upscayl', pricingType: 'OPEN_SOURCE', tags: '图像处理,放大,开源', category: 'image' },
      
      // AI 视频
      { name: 'Pika', slug: 'pika', shortDesc: 'AI 视频生成工具', websiteUrl: 'https://pika.art', pricingType: 'FREEMIUM', tags: '视频生成,AI视频', category: 'video' },
      { name: 'HeyGen', slug: 'heygen', shortDesc: 'AI 数字人视频生成', websiteUrl: 'https://www.heygen.com', pricingType: 'PAID', tags: '视频生成,数字人,AI视频', category: 'video' },
      { name: 'Synthesia', slug: 'synthesia', shortDesc: 'AI 视频生成平台', websiteUrl: 'https://www.synthesia.io', pricingType: 'PAID', tags: '视频生成,数字人', category: 'video' },
      { name: 'CapCut', slug: 'capcut', shortDesc: '剪映国际版，集成 AI 功能', websiteUrl: 'https://www.capcut.com', pricingType: 'FREEMIUM', tags: '视频编辑,AI剪辑', category: 'video' },
      { name: 'Descript', slug: 'descript', shortDesc: 'AI 音视频编辑工具', websiteUrl: 'https://www.descript.com', pricingType: 'FREEMIUM', tags: '视频编辑,音频编辑,AI剪辑', category: 'video' },
      
      // AI 编程
      { name: 'Codeium', slug: 'codeium', shortDesc: '免费 AI 编程助手', websiteUrl: 'https://codeium.com', pricingType: 'FREE', tags: '编程,代码补全,免费', category: 'code' },
      { name: 'Tabnine', slug: 'tabnine', shortDesc: 'AI 代码补全工具', websiteUrl: 'https://www.tabnine.com', pricingType: 'FREEMIUM', tags: '编程,代码补全', category: 'code' },
      { name: 'Replit Ghostwriter', slug: 'replit-ghostwriter', shortDesc: 'Replit 内置 AI 编程助手', websiteUrl: 'https://replit.com', pricingType: 'PAID', tags: '编程,IDE,代码生成', category: 'code' },
      { name: 'Sourcegraph Cody', slug: 'cody', shortDesc: 'AI 代码助手，支持代码库问答', websiteUrl: 'https://sourcegraph.com/cody', pricingType: 'FREEMIUM', tags: '编程,代码搜索,AI助手', category: 'code' },
      { name: 'V0.dev', slug: 'v0', shortDesc: 'Vercel AI 生成 UI 组件', websiteUrl: 'https://v0.dev', pricingType: 'FREEMIUM', tags: '编程,UI生成,前端', category: 'code' },
      { name: 'Bolt.new', slug: 'bolt-new', shortDesc: 'AI 生成全栈应用', websiteUrl: 'https://bolt.new', pricingType: 'FREEMIUM', tags: '编程,全栈,应用生成', category: 'code' },
      
      // AI 写作
      { name: 'Jasper', slug: 'jasper', shortDesc: 'AI 营销文案写作工具', websiteUrl: 'https://www.jasper.ai', pricingType: 'PAID', tags: '写作,营销,文案', category: 'writing' },
      { name: 'Copy.ai', slug: 'copy-ai', shortDesc: 'AI 文案生成工具', websiteUrl: 'https://www.copy.ai', pricingType: 'FREEMIUM', tags: '写作,营销,文案', category: 'writing' },
      { name: 'Writesonic', slug: 'writesonic', shortDesc: 'AI 写作助手', websiteUrl: 'https://writesonic.com', pricingType: 'FREEMIUM', tags: '写作,SEO,文案', category: 'writing' },
      { name: 'Grammarly', slug: 'grammarly', shortDesc: 'AI 写作辅助和语法检查', websiteUrl: 'https://www.grammarly.com', pricingType: 'FREEMIUM', tags: '写作,语法检查,校对', category: 'writing' },
      { name: 'DeepL Write', slug: 'deepl-write', shortDesc: 'AI 写作助手和改写工具', websiteUrl: 'https://www.deepl.com/write', pricingType: 'FREEMIUM', tags: '写作,改写,翻译', category: 'writing' },
      
      // AI 搜索
      { name: 'You.com', slug: 'you-com', shortDesc: 'AI 搜索引擎', websiteUrl: 'https://you.com', pricingType: 'FREE', tags: '搜索,AI搜索,隐私', category: 'search' },
      { name: 'Neeva', slug: 'neeva', shortDesc: '无广告 AI 搜索引擎', websiteUrl: 'https://neeva.com', pricingType: 'FREEMIUM', tags: '搜索,AI搜索,隐私', category: 'search' },
      { name: 'Phind', slug: 'phind', shortDesc: '面向开发者的 AI 搜索引擎', websiteUrl: 'https://www.phind.com', pricingType: 'FREE', tags: '搜索,编程,开发者', category: 'search' },
      { name: 'Kagi', slug: 'kagi', shortDesc: '付费 AI 搜索引擎', websiteUrl: 'https://kagi.com', pricingType: 'PAID', tags: '搜索,AI搜索,无广告', category: 'search' },
      { name: '秘塔 AI 搜索', slug: 'metaso', shortDesc: '中文 AI 搜索引擎', websiteUrl: 'https://metaso.cn', pricingType: 'FREE', tags: '搜索,AI搜索,中文', category: 'search' },
      
      // AI 办公
      { name: 'Gamma', slug: 'gamma', shortDesc: 'AI 生成演示文稿', websiteUrl: 'https://gamma.app', pricingType: 'FREEMIUM', tags: '办公,演示文稿,PPT', category: 'office' },
      { name: 'Tome', slug: 'tome', shortDesc: 'AI 叙事和演示工具', websiteUrl: 'https://tome.app', pricingType: 'FREEMIUM', tags: '办公,演示文稿,叙事', category: 'office' },
      { name: 'Beautiful.ai', slug: 'beautiful-ai', shortDesc: 'AI 演示文稿设计', websiteUrl: 'https://www.beautiful.ai', pricingType: 'PAID', tags: '办公,演示文稿,设计', category: 'office' },
      { name: 'Fireflies.ai', slug: 'fireflies', shortDesc: 'AI 会议记录和转录', websiteUrl: 'https://fireflies.ai', pricingType: 'FREEMIUM', tags: '办公,会议,转录', category: 'office' },
      { name: 'Otter.ai', slug: 'otter', shortDesc: 'AI 语音转文字和会议记录', websiteUrl: 'https://otter.ai', pricingType: 'FREEMIUM', tags: '办公,会议,转录', category: 'office' },
      
      // AI 音频
      { name: 'Murf.ai', slug: 'murf', shortDesc: 'AI 语音合成平台', websiteUrl: 'https://murf.ai', pricingType: 'PAID', tags: '语音合成,配音,TTS', category: 'audio' },
      { name: 'Lovo', slug: 'lovo', shortDesc: 'AI 语音生成平台', websiteUrl: 'https://lovo.ai', pricingType: 'PAID', tags: '语音合成,配音', category: 'audio' },
      { name: 'Speechify', slug: 'speechify', shortDesc: 'AI 文本转语音阅读器', websiteUrl: 'https://speechify.com', pricingType: 'FREEMIUM', tags: '语音合成,阅读,辅助', category: 'audio' },
      { name: 'Suno', slug: 'suno', shortDesc: 'AI 音乐生成', websiteUrl: 'https://suno.com', pricingType: 'FREEMIUM', tags: '音乐生成,AI音乐', category: 'audio' },
      { name: 'Udio', slug: 'udio', shortDesc: 'AI 音乐创作平台', websiteUrl: 'https://www.udio.com', pricingType: 'FREEMIUM', tags: '音乐生成,AI音乐', category: 'audio' },
      
      // AI 设计
      { name: 'Canva AI', slug: 'canva-ai', shortDesc: 'Canva 内置 AI 设计工具', websiteUrl: 'https://www.canva.com', pricingType: 'FREEMIUM', tags: '设计,图像编辑,模板', category: 'design' },
      { name: 'Figma AI', slug: 'figma-ai', shortDesc: 'Figma AI 设计助手', websiteUrl: 'https://www.figma.com', pricingType: 'FREEMIUM', tags: '设计,UI设计,协作', category: 'design' },
      { name: 'Adobe Firefly', slug: 'adobe-firefly', shortDesc: 'Adobe AI 创意工具', websiteUrl: 'https://www.adobe.com/products/firefly.html', pricingType: 'FREEMIUM', tags: '设计,图像生成,创意', category: 'design' },
      { name: 'Looka', slug: 'looka', shortDesc: 'AI Logo 设计工具', websiteUrl: 'https://looka.com', pricingType: 'PAID', tags: '设计,Logo,品牌', category: 'design' },
      { name: 'Khroma', slug: 'khroma', shortDesc: 'AI 配色工具', websiteUrl: 'https://khroma.co', pricingType: 'FREE', tags: '设计,配色,工具', category: 'design' },
      
      // AI 开发工具
      { name: 'Vercel', slug: 'vercel', shortDesc: '前端部署平台，集成 AI 功能', websiteUrl: 'https://vercel.com', pricingType: 'FREEMIUM', tags: '开发,部署,前端', category: 'devtool' },
      { name: 'Supabase', slug: 'supabase', shortDesc: '开源 Firebase 替代方案', websiteUrl: 'https://supabase.com', githubUrl: 'https://github.com/supabase/supabase', pricingType: 'OPEN_SOURCE', tags: '开发,数据库,后端,开源', category: 'devtool' },
      { name: 'Railway', slug: 'railway', shortDesc: '应用部署平台', websiteUrl: 'https://railway.app', pricingType: 'FREEMIUM', tags: '开发,部署,后端', category: 'devtool' },
      { name: 'Fly.io', slug: 'fly-io', shortDesc: '应用运行平台', websiteUrl: 'https://fly.io', pricingType: 'PAID', tags: '开发,部署,后端', category: 'devtool' },
      { name: 'Neon', slug: 'neon', shortDesc: 'Serverless Postgres', websiteUrl: 'https://neon.tech', pricingType: 'FREEMIUM', tags: '开发,数据库,Postgres', category: 'devtool' },
      
      // AI 教育
      { name: 'Khan Academy Khanmigo', slug: 'khanmigo', shortDesc: '可汗学院 AI 学习助手', websiteUrl: 'https://www.khanacademy.org', pricingType: 'FREE', tags: '教育,学习,辅导', category: 'education' },
      { name: 'Duolingo Max', slug: 'duolingo-max', shortDesc: 'Duolingo AI 语言学习', websiteUrl: 'https://www.duolingo.com', pricingType: 'PAID', tags: '教育,语言学习,AI导师', category: 'education' },
      { name: 'Quizlet AI', slug: 'quizlet-ai', shortDesc: 'AI 学习卡片和测验', websiteUrl: 'https://quizlet.com', pricingType: 'FREEMIUM', tags: '教育,学习,记忆', category: 'education' },
      { name: 'Synthesis', slug: 'synthesis', shortDesc: 'AI 数学辅导', websiteUrl: 'https://www.synthesis.com', pricingType: 'PAID', tags: '教育,数学,辅导', category: 'education' },
      
      // AI 效率工具
      { name: 'Zapier AI', slug: 'zapier-ai', shortDesc: 'AI 自动化工作流', websiteUrl: 'https://zapier.com', pricingType: 'PAID', tags: '效率,自动化,集成', category: 'productivity' },
      { name: 'Make', slug: 'make', shortDesc: '可视化自动化平台', websiteUrl: 'https://www.make.com', pricingType: 'FREEMIUM', tags: '效率,自动化,集成', category: 'productivity' },
      { name: 'n8n', slug: 'n8n', shortDesc: '开源工作流自动化', websiteUrl: 'https://n8n.io', githubUrl: 'https://github.com/n8n-io/n8n', pricingType: 'OPEN_SOURCE', tags: '效率,自动化,开源', category: 'productivity' },
      { name: 'Bardeen', slug: 'bardeen', shortDesc: 'AI 自动化助手', websiteUrl: 'https://www.bardeen.ai', pricingType: 'FREEMIUM', tags: '效率,自动化,浏览器', category: 'productivity' },
      { name: 'Raycast', slug: 'raycast', shortDesc: 'Mac 效率启动器', websiteUrl: 'https://www.raycast.com', pricingType: 'FREE', tags: '效率,启动器,Mac', category: 'productivity' },
      
      // AI 研究工具
      { name: 'Elicit', slug: 'elicit', shortDesc: 'AI 研究助手', websiteUrl: 'https://elicit.org', pricingType: 'FREEMIUM', tags: '研究,学术,文献', category: 'research' },
      { name: 'Consensus', slug: 'consensus', shortDesc: 'AI 科学搜索引擎', websiteUrl: 'https://consensus.app', pricingType: 'FREEMIUM', tags: '研究,学术,科学', category: 'research' },
      { name: 'Research Rabbit', slug: 'research-rabbit', shortDesc: 'AI 文献发现工具', websiteUrl: 'https://www.researchrabbit.ai', pricingType: 'FREE', tags: '研究,学术,文献', category: 'research' },
      { name: 'SciSpace', slug: 'scispace', shortDesc: 'AI 论文阅读助手', websiteUrl: 'https://typeset.io', pricingType: 'FREEMIUM', tags: '研究,学术,论文', category: 'research' },
      
      // AI 浏览器扩展
      { name: 'Monica', slug: 'monica', shortDesc: 'AI 浏览器助手', websiteUrl: 'https://monica.im', pricingType: 'FREEMIUM', tags: '浏览器,扩展,AI助手', category: 'browser' },
      { name: 'Merlin', slug: 'merlin', shortDesc: 'ChatGPT 浏览器扩展', websiteUrl: 'https://www.getmerlin.in', pricingType: 'FREEMIUM', tags: '浏览器,扩展,ChatGPT', category: 'browser' },
      { name: 'MaxAI.me', slug: 'maxai', shortDesc: 'AI 阅读写作助手', websiteUrl: 'https://maxai.me', pricingType: 'FREEMIUM', tags: '浏览器,扩展,阅读', category: 'browser' },
      { name: 'Wiseone', slug: 'wiseone', shortDesc: 'AI 阅读助手', websiteUrl: 'https://wiseone.io', pricingType: 'FREEMIUM', tags: '浏览器,扩展,阅读', category: 'browser' },
      
      // AI 3D
      { name: 'Meshy', slug: 'meshy', shortDesc: 'AI 3D 模型生成', websiteUrl: 'https://www.meshy.ai', pricingType: 'FREEMIUM', tags: '3D,模型生成,设计', category: '3d' },
      { name: 'Spline AI', slug: 'spline-ai', shortDesc: 'AI 3D 设计工具', websiteUrl: 'https://spline.design', pricingType: 'FREEMIUM', tags: '3D,设计,交互', category: '3d' },
      { name: 'Luma AI', slug: 'luma-ai', shortDesc: 'AI 3D 扫描和生成', websiteUrl: 'https://lumalabs.ai', pricingType: 'FREEMIUM', tags: '3D,扫描,NeRF', category: '3d' },
      { name: 'Tripo3D', slug: 'tripo3d', shortDesc: 'AI 3D 生成平台', websiteUrl: 'https://www.tripo3d.ai', pricingType: 'FREEMIUM', tags: '3D,模型生成,中文', category: '3d' },
      
      // AI 数据分析
      { name: 'Julius AI', slug: 'julius-ai', shortDesc: 'AI 数据分析助手', websiteUrl: 'https://julius.ai', pricingType: 'FREEMIUM', tags: '数据分析,可视化,研究', category: 'data' },
      { name: 'ChatCSV', slug: 'chatcsv', shortDesc: 'AI CSV 数据分析', websiteUrl: 'https://www.chatcsv.co', pricingType: 'FREEMIUM', tags: '数据分析,CSV,表格', category: 'data' },
      { name: 'Rows', slug: 'rows', shortDesc: 'AI 电子表格', websiteUrl: 'https://rows.com', pricingType: 'FREEMIUM', tags: '数据分析,表格,协作', category: 'data' },
      { name: 'Ajelix', slug: 'ajelix', shortDesc: 'AI Excel 助手', websiteUrl: 'https://ajelix.com', pricingType: 'FREEMIUM', tags: '数据分析,Excel,表格', category: 'data' },
      
      // 第二批：扩充到 300+ 工具
      // AI 聊天 - 更多
      { name: 'Poe', slug: 'poe', shortDesc: 'Quora 推出的 AI 聊天聚合平台', websiteUrl: 'https://poe.com', pricingType: 'FREEMIUM', tags: '聊天,AI助手,聚合', category: 'chat' },
      { name: 'Character.AI', slug: 'character-ai', shortDesc: 'AI 角色扮演聊天', websiteUrl: 'https://character.ai', pricingType: 'FREE', tags: '聊天,角色扮演,娱乐', category: 'chat' },
      { name: 'Pi', slug: 'pi', shortDesc: 'Inflection AI 个人助手', websiteUrl: 'https://pi.ai', pricingType: 'FREE', tags: '聊天,个人助手,情感', category: 'chat' },
      { name: 'YouChat', slug: 'youchat', shortDesc: 'You.com 的 AI 聊天助手', websiteUrl: 'https://you.com', pricingType: 'FREE', tags: '聊天,搜索,AI助手', category: 'chat' },
      { name: 'HuggingChat', slug: 'huggingchat', shortDesc: 'Hugging Face 开源聊天', websiteUrl: 'https://huggingface.co/chat', pricingType: 'FREE', tags: '聊天,开源,HuggingFace', category: 'chat' },
      { name: 'Mistral AI', slug: 'mistral', shortDesc: 'Mistral 大语言模型', websiteUrl: 'https://chat.mistral.ai', pricingType: 'FREEMIUM', tags: '聊天,开源,欧洲', category: 'chat' },
      { name: 'Cohere', slug: 'cohere', shortDesc: '企业级 NLP 平台', websiteUrl: 'https://cohere.com', pricingType: 'PAID', tags: 'NLP,API,企业', category: 'chat' },
      { name: 'Grok', slug: 'grok', shortDesc: 'xAI 开发的 AI 助手', websiteUrl: 'https://grok.x.ai', pricingType: 'PAID', tags: '聊天,X平台,实时', category: 'chat' },
      { name: 'Perplexity', slug: 'perplexity', shortDesc: 'AI 搜索引擎和问答', websiteUrl: 'https://www.perplexity.ai', pricingType: 'FREEMIUM', tags: '搜索,问答,研究', category: 'chat' },
      { name: 'Andi', slug: 'andi', shortDesc: '生成式 AI 搜索引擎', websiteUrl: 'https://andisearch.com', pricingType: 'FREE', tags: '搜索,AI助手,隐私', category: 'chat' },
      
      // AI 图像 - 更多
      { name: 'Ideogram', slug: 'ideogram', shortDesc: 'AI 图像生成，擅长文字', websiteUrl: 'https://ideogram.ai', pricingType: 'FREE', tags: '图像生成,文字,设计', category: 'image' },
      { name: 'SeaArt', slug: 'seaart', shortDesc: 'AI 绘画平台', websiteUrl: 'https://www.seaart.ai', pricingType: 'FREEMIUM', tags: '图像生成,绘画,中文', category: 'image' },
      { name: 'LiblibAI', slug: 'liblibai', shortDesc: '国内 AI 绘画平台', websiteUrl: 'https://www.liblib.art', pricingType: 'FREEMIUM', tags: '图像生成,绘画,中文', category: 'image' },
      { name: '吐司 Tusi.Art', slug: 'tusi-art', shortDesc: 'AI 绘画创作平台', websiteUrl: 'https://tusiart.com', pricingType: 'FREEMIUM', tags: '图像生成,绘画,中文', category: 'image' },
      { name: '通义万相', slug: 'tongyi-wanxiang', shortDesc: '阿里云 AI 绘画', websiteUrl: 'https://tongyi.aliyun.com/wanxiang', pricingType: 'FREEMIUM', tags: '图像生成,阿里,中文', category: 'image' },
      { name: '文心一格', slug: 'wenxin-yige', shortDesc: '百度 AI 绘画', websiteUrl: 'https://yige.baidu.com', pricingType: 'FREEMIUM', tags: '图像生成,百度,中文', category: 'image' },
      { name: '即时 AI', slug: 'js-design-ai', shortDesc: '即时设计 AI 绘画', websiteUrl: 'https://js.design/ai', pricingType: 'FREEMIUM', tags: '图像生成,设计,中文', category: 'image' },
      { name: 'Vega AI', slug: 'vega-ai', shortDesc: 'AI 绘画创作平台', websiteUrl: 'https://www.vegaai.net', pricingType: 'FREEMIUM', tags: '图像生成,绘画,中文', category: 'image' },
      { name: '6pen Art', slug: '6pen', shortDesc: 'AI 绘画生成', websiteUrl: 'https://6pen.art', pricingType: 'FREEMIUM', tags: '图像生成,绘画,中文', category: 'image' },
      { name: 'Draft.art', slug: 'draft-art', shortDesc: 'AI 绘画社区', websiteUrl: 'https://draft.art', pricingType: 'FREEMIUM', tags: '图像生成,绘画,社区', category: 'image' },
      { name: '无界 AI', slug: 'wujie-ai', shortDesc: 'AI 绘画创作平台', websiteUrl: 'https://www.wujieai.com', pricingType: 'FREEMIUM', tags: '图像生成,绘画,中文', category: 'image' },
      { name: 'MewXAI', slug: 'mewxai', shortDesc: 'AI 绘画平台', websiteUrl: 'https://www.mewxai.cn', pricingType: 'FREEMIUM', tags: '图像生成,绘画,中文', category: 'image' },
      { name: '改图鸭', slug: 'gaituya', shortDesc: 'AI 图片编辑工具', websiteUrl: 'https://www.gaituya.com', pricingType: 'FREEMIUM', tags: '图像处理,编辑,中文', category: 'image' },
      { name: 'PicWish', slug: 'picwish', shortDesc: 'AI 图片处理工具', websiteUrl: 'https://picwish.com', pricingType: 'FREEMIUM', tags: '图像处理,抠图,修复', category: 'image' },
      { name: 'Cutout.Pro', slug: 'cutout-pro', shortDesc: 'AI 视觉设计平台', websiteUrl: 'https://www.cutout.pro', pricingType: 'FREEMIUM', tags: '图像处理,抠图,设计', category: 'image' },
      { name: 'Hotpot.ai', slug: 'hotpot-ai', shortDesc: 'AI 图像生成和编辑', websiteUrl: 'https://hotpot.ai', pricingType: 'FREEMIUM', tags: '图像生成,编辑,设计', category: 'image' },
      { name: 'Artbreeder', slug: 'artbreeder', shortDesc: 'AI 图像合成平台', websiteUrl: 'https://www.artbreeder.com', pricingType: 'FREEMIUM', tags: '图像生成,合成,艺术', category: 'image' },
      { name: 'DeepAI', slug: 'deepai', shortDesc: 'AI 图像生成 API', websiteUrl: 'https://deepai.org', pricingType: 'FREEMIUM', tags: '图像生成,API,开发', category: 'image' },
      { name: 'NightCafe', slug: 'nightcafe', shortDesc: 'AI 艺术生成社区', websiteUrl: 'https://creator.nightcafe.studio', pricingType: 'FREEMIUM', tags: '图像生成,艺术,社区', category: 'image' },
      { name: 'StarryAI', slug: 'starryai', shortDesc: 'AI 艺术生成应用', websiteUrl: 'https://starryai.com', pricingType: 'FREEMIUM', tags: '图像生成,艺术,移动', category: 'image' },
      { name: 'Wombo Dream', slug: 'wombo-dream', shortDesc: 'AI 艺术生成应用', websiteUrl: 'https://www.wombo.art', pricingType: 'FREEMIUM', tags: '图像生成,艺术,移动', category: 'image' },
      { name: 'Craiyon', slug: 'craiyon', shortDesc: '免费 AI 图像生成', websiteUrl: 'https://www.craiyon.com', pricingType: 'FREE', tags: '图像生成,免费,DALL-E', category: 'image' },
      { name: 'Dream by WOMBO', slug: 'dream-wombo', shortDesc: 'AI 艺术生成', websiteUrl: 'https://dream.ai', pricingType: 'FREEMIUM', tags: '图像生成,艺术,移动', category: 'image' },
      { name: 'Generated Photos', slug: 'generated-photos', shortDesc: 'AI 生成人物照片', websiteUrl: 'https://generated.photos', pricingType: 'PAID', tags: '图像生成,人像,素材', category: 'image' },
      { name: 'This Person Does Not Exist', slug: 'this-person', shortDesc: 'AI 生成虚拟人像', websiteUrl: 'https://thispersondoesnotexist.com', pricingType: 'FREE', tags: '图像生成,人像,趣味', category: 'image' },
      { name: 'BigJPG', slug: 'bigjpg', shortDesc: 'AI 图片无损放大', websiteUrl: 'https://bigjpg.com', pricingType: 'FREEMIUM', tags: '图像处理,放大,动漫', category: 'image' },
      { name: 'Waifu2x', slug: 'waifu2x', shortDesc: '图片放大和降噪', websiteUrl: 'https://waifu2x.udp.jp', pricingType: 'FREE', tags: '图像处理,放大,开源', category: 'image' },
      { name: 'Lets Enhance', slug: 'lets-enhance', shortDesc: 'AI 图片增强', websiteUrl: 'https://letsenhance.io', pricingType: 'FREEMIUM', tags: '图像处理,增强,放大', category: 'image' },
      { name: 'VanceAI', slug: 'vanceai', shortDesc: 'AI 图片处理工具集', websiteUrl: 'https://vanceai.com', pricingType: 'PAID', tags: '图像处理,编辑,增强', category: 'image' },
      { name: 'Fotor AI', slug: 'fotor-ai', shortDesc: 'AI 图片编辑器', websiteUrl: 'https://www.fotor.com', pricingType: 'FREEMIUM', tags: '图像编辑,设计,照片', category: 'image' },
      { name: 'Photopea', slug: 'photopea', shortDesc: '免费在线 PS 替代品', websiteUrl: 'https://www.photopea.com', pricingType: 'FREE', tags: '图像编辑,PS,设计', category: 'image' },
      { name: 'Clipdrop', slug: 'clipdrop', shortDesc: 'Stability AI 图像工具', websiteUrl: 'https://clipdrop.co', pricingType: 'FREEMIUM', tags: '图像处理,编辑,AI', category: 'image' },
      { name: 'Cleanup.pictures', slug: 'cleanup-pictures', shortDesc: 'AI 移除图片物体', websiteUrl: 'https://cleanup.pictures', pricingType: 'FREEMIUM', tags: '图像处理,修复,移除', category: 'image' },
      { name: 'WatermarkRemover.io', slug: 'watermark-remover', shortDesc: 'AI 去水印', websiteUrl: 'https://www.watermarkremover.io', pricingType: 'FREEMIUM', tags: '图像处理,去水印,修复', category: 'image' },
      { name: 'RestorePhotos.io', slug: 'restore-photos', shortDesc: 'AI 老照片修复', websiteUrl: 'https://www.restorephotos.io', pricingType: 'FREE', tags: '图像处理,修复,老照片', category: 'image' },
      { name: 'Palette.fm', slug: 'palette-fm', shortDesc: 'AI 黑白照片上色', websiteUrl: 'https://palette.fm', pricingType: 'FREEMIUM', tags: '图像处理,上色,修复', category: 'image' },
      { name: 'DeOldify', slug: 'deoldify', shortDesc: '开源老照片修复', websiteUrl: 'https://github.com/jantic/DeOldify', githubUrl: 'https://github.com/jantic/DeOldify', pricingType: 'OPEN_SOURCE', tags: '图像处理,修复,开源', category: 'image' },
      { name: 'GFPGAN', slug: 'gfpgan', shortDesc: '人脸修复增强', websiteUrl: 'https://github.com/TencentARC/GFPGAN', githubUrl: 'https://github.com/TencentARC/GFPGAN', pricingType: 'OPEN_SOURCE', tags: '图像处理,人脸,开源', category: 'image' },
      { name: 'CodeFormer', slug: 'codeformer', shortDesc: '人脸修复工具', websiteUrl: 'https://github.com/sczhou/CodeFormer', githubUrl: 'https://github.com/sczhou/CodeFormer', pricingType: 'OPEN_SOURCE', tags: '图像处理,人脸,开源', category: 'image' },
      { name: 'Real-ESRGAN', slug: 'real-esrgan', shortDesc: '图像超分辨率', websiteUrl: 'https://github.com/xinntao/Real-ESRGAN', githubUrl: 'https://github.com/xinntao/Real-ESRGAN', pricingType: 'OPEN_SOURCE', tags: '图像处理,放大,开源', category: 'image' },
      { name: 'AnimeGAN', slug: 'animegan', shortDesc: '照片转动漫风格', websiteUrl: 'https://github.com/TachibanaYoshino/AnimeGANv2', githubUrl: 'https://github.com/TachibanaYoshino/AnimeGANv2', pricingType: 'OPEN_SOURCE', tags: '图像处理,动漫,风格迁移', category: 'image' },
      { name: 'ToonMe', slug: 'toonme', shortDesc: '照片转卡通', websiteUrl: 'https://toonme.com', pricingType: 'FREEMIUM', tags: '图像处理,卡通,滤镜', category: 'image' },
      { name: 'Prisma', slug: 'prisma', shortDesc: '照片艺术滤镜', websiteUrl: 'https://prisma-ai.com', pricingType: 'FREEMIUM', tags: '图像处理,滤镜,艺术', category: 'image' },
      { name: 'Lensa', slug: 'lensa', shortDesc: 'AI 照片编辑应用', websiteUrl: 'https://lensa.app', pricingType: 'PAID', tags: '图像处理,编辑,移动', category: 'image' },
      { name: 'Remini', slug: 'remini', shortDesc: 'AI 照片增强', websiteUrl: 'https://www.remini.ai', pricingType: 'FREEMIUM', tags: '图像处理,增强,移动', category: 'image' },
      { name: 'FaceApp', slug: 'faceapp', shortDesc: 'AI 人脸编辑', websiteUrl: 'https://www.faceapp.com', pricingType: 'FREEMIUM', tags: '图像处理,人脸,娱乐', category: 'image' },
      { name: 'Reface', slug: 'reface', shortDesc: 'AI 换脸应用', websiteUrl: 'https://reface.ai', pricingType: 'FREEMIUM', tags: '图像处理,换脸,娱乐', category: 'image' },
      { name: 'MyHeritage', slug: 'myheritage', shortDesc: 'AI 照片动画', websiteUrl: 'https://www.myheritage.com', pricingType: 'FREEMIUM', tags: '图像处理,动画,家谱', category: 'image' },
      { name: 'D-ID', slug: 'd-id', shortDesc: '照片转视频数字人', websiteUrl: 'https://www.d-id.com', pricingType: 'PAID', tags: '图像处理,视频,数字人', category: 'image' },
      { name: 'Avatarify', slug: 'avatarify', shortDesc: '实时换脸', websiteUrl: 'https://github.com/alievk/avatarify', githubUrl: 'https://github.com/alievk/avatarify', pricingType: 'OPEN_SOURCE', tags: '图像处理,换脸,实时', category: 'image' },
      
      // AI 视频 - 更多
      { name: 'Kling AI', slug: 'kling-ai', shortDesc: '快手 AI 视频生成', websiteUrl: 'https://klingai.com', pricingType: 'FREEMIUM', tags: '视频生成,快手,中文', category: 'video' },
      { name: '即梦 AI', slug: 'jimeng-ai', shortDesc: '剪映 AI 视频生成', websiteUrl: 'https://jimeng.jianying.com', pricingType: 'FREEMIUM', tags: '视频生成,剪映,中文', category: 'video' },
      { name: '可灵 AI', slug: 'keling-ai', shortDesc: '快手可灵视频生成', websiteUrl: 'https://klingai.com', pricingType: 'FREEMIUM', tags: '视频生成,快手,中文', category: 'video' },
      { name: 'Vidu', slug: 'vidu', shortDesc: '生数科技 AI 视频', websiteUrl: 'https://www.vidu.studio', pricingType: 'FREEMIUM', tags: '视频生成,清华,中文', category: 'video' },
      { name: '清影', slug: 'qingying', shortDesc: '智谱 AI 视频生成', websiteUrl: 'https://chatglm.cn/video', pricingType: 'FREEMIUM', tags: '视频生成,智谱,中文', category: 'video' },
      { name: 'Morph Studio', slug: 'morph-studio', shortDesc: 'AI 视频生成社区', websiteUrl: 'https://morphstudio.com', pricingType: 'FREEMIUM', tags: '视频生成,社区,创作', category: 'video' },
      { name: 'Luma Dream Machine', slug: 'dream-machine', shortDesc: 'Luma AI 视频生成', websiteUrl: 'https://lumalabs.ai/dream-machine', pricingType: 'FREEMIUM', tags: '视频生成,AI视频,免费', category: 'video' },
      { name: 'Runway Gen-3', slug: 'runway-gen3', shortDesc: 'Runway 第三代视频生成', websiteUrl: 'https://runwayml.com', pricingType: 'PAID', tags: '视频生成,Gen-3,专业', category: 'video' },
      { name: 'Pika 1.5', slug: 'pika-1-5', shortDesc: 'Pika 视频生成新版', websiteUrl: 'https://pika.art', pricingType: 'FREEMIUM', tags: '视频生成,Pika,特效', category: 'video' },
      { name: 'Haiper', slug: 'haiper', shortDesc: 'AI 视频生成平台', websiteUrl: 'https://haiper.ai', pricingType: 'FREEMIUM', tags: '视频生成,免费,高清', category: 'video' },
      { name: 'PixVerse', slug: 'pixverse', shortDesc: 'AI 视频生成', websiteUrl: 'https://pixverse.ai', pricingType: 'FREEMIUM', tags: '视频生成,爱诗科技,中文', category: 'video' },
      { name: 'Viggle', slug: 'viggle', shortDesc: 'AI 视频角色动画', websiteUrl: 'https://viggle.ai', pricingType: 'FREEMIUM', tags: '视频生成,角色,动画', category: 'video' },
      { name: 'DomoAI', slug: 'domoai', shortDesc: 'AI 视频风格转换', websiteUrl: 'https://domoai.app', pricingType: 'FREEMIUM', tags: '视频生成,动漫,风格', category: 'video' },
      { name: 'GoEnhance', slug: 'goenhance', shortDesc: 'AI 视频增强', websiteUrl: 'https://www.goenhance.ai', pricingType: 'FREEMIUM', tags: '视频处理,增强,放大', category: 'video' },
      { name: 'Topaz Video AI', slug: 'topaz-video', shortDesc: '专业视频增强', websiteUrl: 'https://www.topazlabs.com', pricingType: 'PAID', tags: '视频处理,增强,专业', category: 'video' },
      { name: 'Unscreen', slug: 'unscreen', shortDesc: 'AI 视频去背景', websiteUrl: 'https://www.unscreen.com', pricingType: 'FREEMIUM', tags: '视频处理,抠图,背景移除', category: 'video' },
      { name: 'Runway ML', slug: 'runway-ml-video', shortDesc: 'AI 视频编辑套件', websiteUrl: 'https://runwayml.com', pricingType: 'PAID', tags: '视频编辑,AI套件,专业', category: 'video' },
      { name: 'Wondershare Filmora', slug: 'filmora', shortDesc: '万兴喵影 AI 版', websiteUrl: 'https://filmora.wondershare.com', pricingType: 'PAID', tags: '视频编辑,AI功能,中文', category: 'video' },
      { name: '剪映专业版', slug: 'jianying-pro', shortDesc: '抖音官方剪辑工具', websiteUrl: 'https://www.capcut.cn', pricingType: 'FREE', tags: '视频编辑,抖音,中文', category: 'video' },
      { name: '必剪', slug: 'bijian', shortDesc: 'B站官方剪辑工具', websiteUrl: 'https://bcut.bilibili.cn', pricingType: 'FREE', tags: '视频编辑,B站,中文', category: 'video' },
      { name: '快影', slug: 'kuaiying', shortDesc: '快手官方剪辑工具', websiteUrl: 'https://kuaishou.com', pricingType: 'FREE', tags: '视频编辑,快手,中文', category: 'video' },
      { name: '度加剪辑', slug: 'dujia', shortDesc: '百度 AI 视频剪辑', websiteUrl: 'https://ducut.baidu.com', pricingType: 'FREE', tags: '视频编辑,百度,AI', category: 'video' },
      { name: '腾讯智影', slug: 'tencent-zhiying', shortDesc: '腾讯 AI 视频创作', websiteUrl: 'https://zenvideo.qq.com', pricingType: 'FREEMIUM', tags: '视频编辑,腾讯,数字人', category: 'video' },
      { name: '来画', slug: 'laihua', shortDesc: 'AI 动画视频制作', websiteUrl: 'https://www.laihua.com', pricingType: 'FREEMIUM', tags: '视频编辑,动画,中文', category: 'video' },
      { name: '万彩动画大师', slug: 'wanicai', shortDesc: 'MG 动画制作软件', websiteUrl: 'https://www.animiz.cn', pricingType: 'PAID', tags: '视频编辑,动画,MG', category: 'video' },
      { name: 'D-ID Creative Reality', slug: 'd-id-creative', shortDesc: 'AI 数字人视频', websiteUrl: 'https://studio.d-id.com', pricingType: 'PAID', tags: '视频生成,数字人,演讲', category: 'video' },
      { name: 'Synthesia', slug: 'synthesia-video', shortDesc: 'AI 数字人视频平台', websiteUrl: 'https://www.synthesia.io', pricingType: 'PAID', tags: '视频生成,数字人,企业', category: 'video' },
      { name: 'Colossyan', slug: 'colossyan', shortDesc: 'AI 视频生成数字人', websiteUrl: 'https://www.colossyan.com', pricingType: 'PAID', tags: '视频生成,数字人,培训', category: 'video' },
      { name: 'Hour One', slug: 'hour-one', shortDesc: 'AI 虚拟人视频', websiteUrl: 'https://hourone.ai', pricingType: 'PAID', tags: '视频生成,虚拟人,企业', category: 'video' },
      { name: 'Elai.io', slug: 'elai', shortDesc: 'AI 文本转视频', websiteUrl: 'https://elai.io', pricingType: 'PAID', tags: '视频生成,文本转视频', category: 'video' },
      { name: 'Pictory', slug: 'pictory', shortDesc: 'AI 长视频转短视频', websiteUrl: 'https://pictory.ai', pricingType: 'PAID', tags: '视频编辑,摘要,营销', category: 'video' },
      { name: 'OpusClip', slug: 'opusclip', shortDesc: 'AI 视频剪辑 repurposing', websiteUrl: 'https://www.opus.pro', pricingType: 'FREEMIUM', tags: '视频编辑,剪辑,社媒', category: 'video' },
      { name: 'Munch', slug: 'munch', shortDesc: 'AI 视频内容再利用', websiteUrl: 'https://www.getmunch.com', pricingType: 'PAID', tags: '视频编辑,社媒,营销', category: 'video' },
      { name: 'Klap', slug: 'klap', shortDesc: 'AI 生成短视频', websiteUrl: 'https://klap.app', pricingType: 'PAID', tags: '视频编辑,短视频,TikTok', category: 'video' },
      { name: 'Submagic', slug: 'submagic', shortDesc: 'AI 视频字幕生成', websiteUrl: 'https://www.submagic.co', pricingType: 'FREEMIUM', tags: '视频编辑,字幕,特效', category: 'video' },
      { name: 'Captions', slug: 'captions', shortDesc: 'AI 视频字幕和剪辑', websiteUrl: 'https://www.captions.ai', pricingType: 'FREEMIUM', tags: '视频编辑,字幕,剪辑', category: 'video' },
      { name: 'VEED.IO', slug: 'veed', shortDesc: '在线视频编辑', websiteUrl: 'https://www.veed.io', pricingType: 'FREEMIUM', tags: '视频编辑,在线,字幕', category: 'video' },
      { name: 'Kapwing', slug: 'kapwing', shortDesc: '协作视频编辑', websiteUrl: 'https://www.kapwing.com', pricingType: 'FREEMIUM', tags: '视频编辑,协作,在线', category: 'video' },
      { name: 'InVideo', slug: 'invideo', shortDesc: 'AI 视频生成', websiteUrl: 'https://invideo.io', pricingType: 'FREEMIUM', tags: '视频生成,模板,营销', category: 'video' },
      { name: 'Fliki', slug: 'fliki', shortDesc: '文本转视频', websiteUrl: 'https://fliki.ai', pricingType: 'FREEMIUM', tags: '视频生成,文本转视频', category: 'video' },
      { name: 'Lumen5', slug: 'lumen5', shortDesc: '博客转视频', websiteUrl: 'https://lumen5.com', pricingType: 'PAID', tags: '视频生成,营销,博客', category: 'video' },
      { name: 'Wave.video', slug: 'wave-video', shortDesc: '视频制作平台', websiteUrl: 'https://wave.video', pricingType: 'FREEMIUM', tags: '视频编辑,营销,直播', category: 'video' },
      { name: 'Clipchamp', slug: 'clipchamp', shortDesc: '微软视频编辑器', websiteUrl: 'https://clipchamp.com', pricingType: 'FREE', tags: '视频编辑,微软,免费', category: 'video' },
      
      // ========== 第三批：AI 3D、数据分析、浏览器扩展、效率工具 ==========
      
      // AI 3D 生成
      { name: 'Meshy', slug: 'meshy', shortDesc: 'AI 3D 模型生成', websiteUrl: 'https://www.meshy.ai', pricingType: 'FREEMIUM', tags: '3D生成,模型,AI', category: '3d' },
      { name: 'Spline', slug: 'spline', shortDesc: 'AI 3D 设计工具', websiteUrl: 'https://spline.design', pricingType: 'FREEMIUM', tags: '3D设计,交互,Web3D', category: '3d' },
      { name: 'Luma AI', slug: 'luma-ai', shortDesc: 'NeRF 3D 扫描和生成', websiteUrl: 'https://lumalabs.ai', pricingType: 'FREEMIUM', tags: '3D扫描,NeRF,AI', category: '3d' },
      { name: 'CSM 3D', slug: 'csm-3d', shortDesc: '图片转 3D 模型', websiteUrl: 'https://csm.ai', pricingType: 'FREEMIUM', tags: '3D生成,图片转3D,AI', category: '3d' },
      { name: 'Tripo 3D', slug: 'tripo-3d', shortDesc: 'AI 3D 生成平台', websiteUrl: 'https://www.tripo3d.ai', pricingType: 'FREEMIUM', tags: '3D生成,模型,AI', category: '3d' },
      { name: 'Rodin Gen-1', slug: 'rodin', shortDesc: '3D 生成基础模型', websiteUrl: 'https://hyperhuman.top', pricingType: 'FREEMIUM', tags: '3D生成,基础模型,AI', category: '3d' },
      { name: 'Shap-E', slug: 'shap-e', shortDesc: 'OpenAI 开源 3D 生成', websiteUrl: 'https://github.com/openai/shap-e', githubUrl: 'https://github.com/openai/shap-e', pricingType: 'OPEN_SOURCE', tags: '3D生成,开源,OpenAI', category: '3d' },
      { name: 'Point-E', slug: 'point-e', shortDesc: 'OpenAI 点云 3D 生成', websiteUrl: 'https://github.com/openai/point-e', githubUrl: 'https://github.com/openai/point-e', pricingType: 'OPEN_SOURCE', tags: '3D生成,点云,开源', category: '3d' },
      { name: 'DreamGaussian', slug: 'dreamgaussian', shortDesc: '3D 高斯溅射生成', websiteUrl: 'https://github.com/dreamgaussian/dreamgaussian', githubUrl: 'https://github.com/dreamgaussian/dreamgaussian', pricingType: 'OPEN_SOURCE', tags: '3D生成,高斯溅射,开源', category: '3d' },
      { name: 'Wonder3D', slug: 'wonder3d', shortDesc: '单图 3D 重建', websiteUrl: 'https://github.com/xxlong0/Wonder3D', githubUrl: 'https://github.com/xxlong0/Wonder3D', pricingType: 'OPEN_SOURCE', tags: '3D重建,单图,开源', category: '3d' },
      { name: 'Unique3D', slug: 'unique3d', shortDesc: '高保真 3D 生成', websiteUrl: 'https://github.com/AiuniAI/Unique3D', githubUrl: 'https://github.com/AiuniAI/Unique3D', pricingType: 'OPEN_SOURCE', tags: '3D生成,高保真,开源', category: '3d' },
      { name: 'InstantMesh', slug: 'instantmesh', shortDesc: '即时 3D 网格生成', websiteUrl: 'https://github.com/TencentARC/InstantMesh', githubUrl: 'https://github.com/TencentARC/InstantMesh', pricingType: 'OPEN_SOURCE', tags: '3D生成,网格,开源', category: '3d' },
      { name: 'Stable Fast 3D', slug: 'sf3d', shortDesc: 'Stability AI 快速 3D', websiteUrl: 'https://stable-fast-3d.github.io', githubUrl: 'https://github.com/Stability-AI/stable-fast-3d', pricingType: 'OPEN_SOURCE', tags: '3D生成,快速,开源', category: '3d' },
      { name: 'Zero123', slug: 'zero123', shortDesc: '单图新视角合成', websiteUrl: 'https://github.com/cvlab-columbia/zero123', githubUrl: 'https://github.com/cvlab-columbia/zero123', pricingType: 'OPEN_SOURCE', tags: '3D生成,视角合成,开源', category: '3d' },
      { name: 'One-2-3-45', slug: 'one-2-3-45', shortDesc: '单图 3D 重建', websiteUrl: 'https://github.com/One-2-3-45/One-2-3-45', githubUrl: 'https://github.com/One-2-3-45/One-2-3-45', pricingType: 'OPEN_SOURCE', tags: '3D重建,单图,开源', category: '3d' },
      { name: 'Magic123', slug: 'magic123', shortDesc: '单图高质量 3D', websiteUrl: 'https://github.com/guochengqian/Magic123', githubUrl: 'https://github.com/guochengqian/Magic123', pricingType: 'OPEN_SOURCE', tags: '3D生成,高质量,开源', category: '3d' },
      { name: '3DFY', slug: '3dfy', shortDesc: '文本/图片转 3D', websiteUrl: 'https://3dfy.ai', pricingType: 'FREEMIUM', tags: '3D生成,文本转3D,AI', category: '3d' },
      { name: 'Sudo AI', slug: 'sudo-ai', shortDesc: 'AI 3D 模型生成', websiteUrl: 'https://www.sudo.ai', pricingType: 'FREEMIUM', tags: '3D生成,模型,AI', category: '3d' },
      { name: 'Kaedim', slug: 'kaedim', shortDesc: '2D 转 3D 游戏资产', websiteUrl: 'https://kaedim3d.com', pricingType: 'PAID', tags: '3D生成,游戏资产,AI', category: '3d' },
      { name: 'Masterpiece Studio', slug: 'masterpiece', shortDesc: 'AI 3D 创作套件', websiteUrl: 'https://masterpiecestudio.com', pricingType: 'FREEMIUM', tags: '3D创作,套件,VR', category: '3d' },
      
      // AI 数据分析
      { name: 'Julius AI', slug: 'julius-ai', shortDesc: 'AI 数据分析助手', websiteUrl: 'https://julius.ai', pricingType: 'FREEMIUM', tags: '数据分析,可视化,AI', category: 'data' },
      { name: 'ChatCSV', slug: 'chatcsv', shortDesc: 'CSV 文件 AI 分析', websiteUrl: 'https://www.chatcsv.co', pricingType: 'FREEMIUM', tags: '数据分析,CSV,聊天', category: 'data' },
      { name: 'Akkio', slug: 'akkio', shortDesc: '无代码 AI 数据分析', websiteUrl: 'https://www.akkio.com', pricingType: 'FREEMIUM', tags: '数据分析,无代码,ML', category: 'data' },
      { name: 'Obviously AI', slug: 'obviously-ai', shortDesc: '自动化机器学习', websiteUrl: 'https://www.obviously.ai', pricingType: 'PAID', tags: '数据分析,AutoML,预测', category: 'data' },
      { name: 'DataRobot', slug: 'datarobot', shortDesc: '企业 AI 平台', websiteUrl: 'https://www.datarobot.com', pricingType: 'CONTACT', tags: '数据分析,企业,ML', category: 'data' },
      { name: 'H2O.ai', slug: 'h2o-ai', shortDesc: '开源 AutoML 平台', websiteUrl: 'https://h2o.ai', githubUrl: 'https://github.com/h2oai/h2o-3', pricingType: 'OPEN_SOURCE', tags: '数据分析,AutoML,开源', category: 'data' },
      { name: 'AutoGluon', slug: 'autogluon', shortDesc: '亚马逊开源 AutoML', websiteUrl: 'https://auto.gluon.ai', githubUrl: 'https://github.com/autogluon/autogluon', pricingType: 'OPEN_SOURCE', tags: '数据分析,AutoML,开源', category: 'data' },
      { name: 'TPOT', slug: 'tpot', shortDesc: '自动化机器学习管道', websiteUrl: 'https://epistasislab.github.io/tpot', githubUrl: 'https://github.com/EpistasisLab/tpot', pricingType: 'OPEN_SOURCE', tags: '数据分析,AutoML,开源', category: 'data' },
      { name: 'Pycaret', slug: 'pycaret', shortDesc: '低代码机器学习', websiteUrl: 'https://pycaret.org', githubUrl: 'https://github.com/pycaret/pycaret', pricingType: 'OPEN_SOURCE', tags: '数据分析,ML,开源', category: 'data' },
      { name: 'Streamlit', slug: 'streamlit', shortDesc: '数据应用构建工具', websiteUrl: 'https://streamlit.io', githubUrl: 'https://github.com/streamlit/streamlit', pricingType: 'OPEN_SOURCE', tags: '数据应用,可视化,开源', category: 'data' },
      { name: 'Gradio', slug: 'gradio', shortDesc: 'ML 模型演示工具', websiteUrl: 'https://www.gradio.app', githubUrl: 'https://github.com/gradio-app/gradio', pricingType: 'OPEN_SOURCE', tags: 'ML演示,界面,开源', category: 'data' },
      { name: 'Weights & Biases', slug: 'wandb', shortDesc: 'ML 实验跟踪', websiteUrl: 'https://wandb.ai', pricingType: 'FREEMIUM', tags: 'ML实验,跟踪,可视化', category: 'data' },
      { name: 'MLflow', slug: 'mlflow', shortDesc: 'ML 生命周期管理', websiteUrl: 'https://mlflow.org', githubUrl: 'https://github.com/mlflow/mlflow', pricingType: 'OPEN_SOURCE', tags: 'ML生命周期,开源,平台', category: 'data' },
      { name: 'DVC', slug: 'dvc', shortDesc: '数据版本控制', websiteUrl: 'https://dvc.org', githubUrl: 'https://github.com/iterative/dvc', pricingType: 'OPEN_SOURCE', tags: '数据版本,ML,开源', category: 'data' },
      { name: 'Great Expectations', slug: 'great-expectations', shortDesc: '数据验证工具', websiteUrl: 'https://greatexpectations.io', githubUrl: 'https://github.com/great-expectations/great_expectations', pricingType: 'OPEN_SOURCE', tags: '数据验证,质量,开源', category: 'data' },
      { name: 'Pandas AI', slug: 'pandas-ai', shortDesc: 'Pandas 对话式分析', websiteUrl: 'https://github.com/gventuri/pandas-ai', githubUrl: 'https://github.com/gventuri/pandas-ai', pricingType: 'OPEN_SOURCE', tags: '数据分析,Pandas,开源', category: 'data' },
      { name: 'LangChain', slug: 'langchain-data', shortDesc: 'LLM 应用框架', websiteUrl: 'https://www.langchain.com', githubUrl: 'https://github.com/langchain-ai/langchain', pricingType: 'OPEN_SOURCE', tags: 'LLM,框架,开源', category: 'data' },
      { name: 'LlamaIndex', slug: 'llamaindex', shortDesc: 'LLM 数据索引框架', websiteUrl: 'https://www.llamaindex.ai', githubUrl: 'https://github.com/run-llama/llama_index', pricingType: 'OPEN_SOURCE', tags: 'LLM,RAG,开源', category: 'data' },
      { name: 'Vercel AI SDK', slug: 'vercel-ai-sdk', shortDesc: 'AI 应用开发 SDK', websiteUrl: 'https://sdk.vercel.ai', githubUrl: 'https://github.com/vercel/ai', pricingType: 'OPEN_SOURCE', tags: 'AI开发,SDK,开源', category: 'data' },
      { name: 'Tableau AI', slug: 'tableau-ai', shortDesc: 'Tableau AI 分析', websiteUrl: 'https://www.tableau.com', pricingType: 'PAID', tags: '数据分析,可视化,BI', category: 'data' },
      
      // AI 浏览器扩展
      { name: 'ChatGPT Sidebar', slug: 'chatgpt-sidebar', shortDesc: '浏览器 AI 侧边栏', websiteUrl: 'https://chatgpt-sidebar.com', pricingType: 'FREEMIUM', tags: '浏览器扩展,ChatGPT,助手', category: 'browser' },
      { name: 'Merlin', slug: 'merlin', shortDesc: '全能 AI 浏览器助手', websiteUrl: 'https://www.getmerlin.in', pricingType: 'FREEMIUM', tags: '浏览器扩展,AI助手,多模型', category: 'browser' },
      { name: 'Monica', slug: 'monica', shortDesc: 'ChatGPT 浏览器助手', websiteUrl: 'https://monica.im', pricingType: 'FREEMIUM', tags: '浏览器扩展,ChatGPT,助手', category: 'browser' },
      { name: 'MaxAI.me', slug: 'maxai', shortDesc: '浏览器 AI 增强', websiteUrl: 'https://maxai.me', pricingType: 'FREEMIUM', tags: '浏览器扩展,AI增强,生产力', category: 'browser' },
      { name: 'Sider', slug: 'sider', shortDesc: '浏览器 AI 侧边栏', websiteUrl: 'https://sider.ai', pricingType: 'FREEMIUM', tags: '浏览器扩展,AI助手,ChatGPT', category: 'browser' },
      { name: 'Lunabot', slug: 'lunabot', shortDesc: 'AI 写作浏览器扩展', websiteUrl: 'https://lunabot.ai', pricingType: 'FREEMIUM', tags: '浏览器扩展,写作,AI', category: 'browser' },
      { name: 'Compose AI', slug: 'compose-ai', shortDesc: 'AI 写作自动补全', websiteUrl: 'https://www.compose.ai', pricingType: 'FREEMIUM', tags: '浏览器扩展,写作,自动补全', category: 'browser' },
      { name: 'Grammarly 浏览器版', slug: 'grammarly-browser', shortDesc: '语法检查扩展', websiteUrl: 'https://www.grammarly.com/browser', pricingType: 'FREEMIUM', tags: '浏览器扩展,语法,写作', category: 'browser' },
      { name: 'DeepL 浏览器版', slug: 'deepl-browser', shortDesc: 'AI 翻译扩展', websiteUrl: 'https://www.deepl.com/translator', pricingType: 'FREEMIUM', tags: '浏览器扩展,翻译,AI', category: 'browser' },
      { name: '沉浸式翻译', slug: 'immersive-translate', shortDesc: '双语网页翻译', websiteUrl: 'https://immersivetranslate.com', pricingType: 'FREE', tags: '浏览器扩展,翻译,中文', category: 'browser' },
      { name: '彩云小译', slug: 'caiyun-translate', shortDesc: 'AI 网页翻译', websiteUrl: 'https://fanyi.caiyunapp.com', pricingType: 'FREEMIUM', tags: '浏览器扩展,翻译,中文', category: 'browser' },
      { name: 'Superpower ChatGPT', slug: 'superpower-chatgpt', shortDesc: 'ChatGPT 功能增强', websiteUrl: 'https://superpowerdaily.com', pricingType: 'FREEMIUM', tags: '浏览器扩展,ChatGPT,增强', category: 'browser' },
      { name: 'AIPRM', slug: 'aiprm', shortDesc: 'ChatGPT 提示词库', websiteUrl: 'https://www.aiprm.com', pricingType: 'FREEMIUM', tags: '浏览器扩展,提示词,ChatGPT', category: 'browser' },
      { name: 'WebChatGPT', slug: 'webchatgpt', shortDesc: 'ChatGPT 联网扩展', websiteUrl: 'https://github.com/qunash/chatgpt-advanced', githubUrl: 'https://github.com/qunash/chatgpt-advanced', pricingType: 'OPEN_SOURCE', tags: '浏览器扩展,ChatGPT,联网', category: 'browser' },
      { name: 'ChatGPT for Google', slug: 'chatgpt-google', shortDesc: '搜索结果 AI 回复', websiteUrl: 'https://chatgpt4google.com', pricingType: 'FREE', tags: '浏览器扩展,搜索,ChatGPT', category: 'browser' },
      { name: 'Perplexity AI', slug: 'perplexity-browser', shortDesc: 'AI 搜索扩展', websiteUrl: 'https://www.perplexity.ai', pricingType: 'FREE', tags: '浏览器扩展,AI搜索,问答', category: 'browser' },
      { name: 'Fireflies Chrome', slug: 'fireflies-chrome', shortDesc: '会议记录扩展', websiteUrl: 'https://fireflies.ai', pricingType: 'FREEMIUM', tags: '浏览器扩展,会议,记录', category: 'browser' },
      { name: 'Tactiq', slug: 'tactiq', shortDesc: '会议实时转录', websiteUrl: 'https://tactiq.io', pricingType: 'FREEMIUM', tags: '浏览器扩展,会议,转录', category: 'browser' },
      { name: 'Otter Chrome', slug: 'otter-chrome', shortDesc: '语音笔记扩展', websiteUrl: 'https://otter.ai', pricingType: 'FREEMIUM', tags: '浏览器扩展,语音,笔记', category: 'browser' },
      { name: 'Readwise', slug: 'readwise', shortDesc: '阅读高亮管理', websiteUrl: 'https://readwise.io', pricingType: 'FREEMIUM', tags: '浏览器扩展,阅读,笔记', category: 'browser' },
      
      // AI 效率工具
      { name: 'Notion AI', slug: 'notion-ai', shortDesc: 'Notion 内置 AI 助手', websiteUrl: 'https://www.notion.so/product/ai', pricingType: 'PAID', tags: '效率,笔记,AI助手', category: 'productivity' },
      { name: 'Mem.ai', slug: 'mem-ai', shortDesc: 'AI 知识管理', websiteUrl: 'https://mem.ai', pricingType: 'FREEMIUM', tags: '效率,知识管理,笔记', category: 'productivity' },
      { name: 'Reflect', slug: 'reflect', shortDesc: 'AI 笔记和思维导图', websiteUrl: 'https://reflect.app', pricingType: 'PAID', tags: '效率,笔记,思维导图', category: 'productivity' },
      { name: 'Obsidian AI', slug: 'obsidian-ai', shortDesc: 'Obsidian AI 插件', websiteUrl: 'https://obsidian.md', pricingType: 'FREEMIUM', tags: '效率,笔记,开源', category: 'productivity' },
      { name: 'Logseq', slug: 'logseq', shortDesc: '开源知识管理', websiteUrl: 'https://logseq.com', githubUrl: 'https://github.com/logseq/logseq', pricingType: 'OPEN_SOURCE', tags: '效率,笔记,开源', category: 'productivity' },
      { name: 'Capacities', slug: 'capacities', shortDesc: 'AI 驱动的笔记', websiteUrl: 'https://capacities.io', pricingType: 'FREEMIUM', tags: '效率,笔记,AI', category: 'productivity' },
      { name: 'Anytype', slug: 'anytype', shortDesc: '去中心化知识库', websiteUrl: 'https://anytype.io', githubUrl: 'https://github.com/anyproto/anytype-ts', pricingType: 'OPEN_SOURCE', tags: '效率,知识库,开源', category: 'productivity' },
      { name: 'Affine', slug: 'affine', shortDesc: '开源 Notion 替代', websiteUrl: 'https://affine.pro', githubUrl: 'https://github.com/toeverything/AFFiNE', pricingType: 'OPEN_SOURCE', tags: '效率,笔记,开源', category: 'productivity' },
      { name: 'AppFlowy', slug: 'appflowy', shortDesc: '开源 Notion 替代', websiteUrl: 'https://www.appflowy.io', githubUrl: 'https://github.com/AppFlowy-IO/AppFlowy', pricingType: 'OPEN_SOURCE', tags: '效率,笔记,开源', category: 'productivity' },
      { name: 'Outline', slug: 'outline', shortDesc: '团队知识库', websiteUrl: 'https://www.getoutline.com', githubUrl: 'https://github.com/outline/outline', pricingType: 'OPEN_SOURCE', tags: '效率,知识库,开源', category: 'productivity' },
      { name: 'BookStack', slug: 'bookstack', shortDesc: '开源文档平台', websiteUrl: 'https://www.bookstackapp.com', githubUrl: 'https://github.com/BookStackApp/BookStack', pricingType: 'OPEN_SOURCE', tags: '效率,文档,开源', category: 'productivity' },
      { name: 'Docmost', slug: 'docmost', shortDesc: '开源协作文档', websiteUrl: 'https://docmost.com', githubUrl: 'https://github.com/docmost/docmost', pricingType: 'OPEN_SOURCE', tags: '效率,文档,开源', category: 'productivity' },
      { name: 'Plane', slug: 'plane', shortDesc: '开源项目管理', websiteUrl: 'https://plane.so', githubUrl: 'https://github.com/makeplane/plane', pricingType: 'OPEN_SOURCE', tags: '效率,项目管理,开源', category: 'productivity' },
      { name: 'Focalboard', slug: 'focalboard', shortDesc: '开源看板工具', websiteUrl: 'https://www.focalboard.com', githubUrl: 'https://github.com/mattermost/focalboard', pricingType: 'OPEN_SOURCE', tags: '效率,看板,开源', category: 'productivity' },
      { name: 'WeKan', slug: 'wekan', shortDesc: '开源看板', websiteUrl: 'https://wekan.github.io', githubUrl: 'https://github.com/wekan/wekan', pricingType: 'OPEN_SOURCE', tags: '效率,看板,开源', category: 'productivity' },
      { name: 'Kanboard', slug: 'kanboard', shortDesc: '极简看板工具', websiteUrl: 'https://kanboard.org', githubUrl: 'https://github.com/kanboard/kanboard', pricingType: 'OPEN_SOURCE', tags: '效率,看板,开源', category: 'productivity' },
      { name: 'Restya', slug: 'restya', shortDesc: '开源看板平台', websiteUrl: 'https://restya.com/board', githubUrl: 'https://github.com/RestyaPlatform/board', pricingType: 'OPEN_SOURCE', tags: '效率,看板,开源', category: 'productivity' },
      { name: 'Taskcafe', slug: 'taskcafe', shortDesc: '开源任务管理', websiteUrl: 'https://taskcafe.dev', githubUrl: 'https://github.com/JordanKnott/taskcafe', pricingType: 'OPEN_SOURCE', tags: '效率,任务,开源', category: 'productivity' },
      { name: 'vikunja', slug: 'vikunja', shortDesc: '开源待办清单', websiteUrl: 'https://vikunja.io', githubUrl: 'https://github.com/go-vikunja/vikunja', pricingType: 'OPEN_SOURCE', tags: '效率,待办,开源', category: 'productivity' },
      { name: 'Planka', slug: 'planka', shortDesc: '开源看板', websiteUrl: 'https://planka.app', githubUrl: 'https://github.com/plankanban/planka', pricingType: 'OPEN_SOURCE', tags: '效率,看板,开源', category: 'productivity' },
      { name: 'Baserow', slug: 'baserow', shortDesc: '开源 Airtable 替代', websiteUrl: 'https://baserow.io', githubUrl: 'https://github.com/bram2w/baserow', pricingType: 'OPEN_SOURCE', tags: '效率,数据库,开源', category: 'productivity' },
      { name: 'NocoDB', slug: 'nocodb', shortDesc: '开源 Airtable 替代', websiteUrl: 'https://nocodb.com', githubUrl: 'https://github.com/nocodb/nocodb', pricingType: 'OPEN_SOURCE', tags: '效率,数据库,开源', category: 'productivity' },
      { name: 'Teable', slug: 'teable', shortDesc: '开源电子表格数据库', websiteUrl: 'https://teable.io', githubUrl: 'https://github.com/teableio/teable', pricingType: 'OPEN_SOURCE', tags: '效率,数据库,开源', category: 'productivity' },
      { name: 'Grist', slug: 'grist', shortDesc: '开源电子表格', websiteUrl: 'https://www.getgrist.com', githubUrl: 'https://github.com/gristlabs/grist-core', pricingType: 'OPEN_SOURCE', tags: '效率,电子表格,开源', category: 'productivity' },
      { name: 'EtherCalc', slug: 'ethercalc', shortDesc: '开源协作电子表格', websiteUrl: 'https://ethercalc.net', githubUrl: 'https://github.com/audreyt/ethercalc', pricingType: 'OPEN_SOURCE', tags: '效率,电子表格,开源', category: 'productivity' },
      { name: 'CryptPad', slug: 'cryptpad', shortDesc: '加密协作办公', websiteUrl: 'https://cryptpad.org', githubUrl: 'https://github.com/cryptpad/cryptpad', pricingType: 'OPEN_SOURCE', tags: '效率,协作,加密,开源', category: 'productivity' },
      { name: 'Nextcloud', slug: 'nextcloud', shortDesc: '开源云办公套件', websiteUrl: 'https://nextcloud.com', githubUrl: 'https://github.com/nextcloud/server', pricingType: 'OPEN_SOURCE', tags: '效率,云办公,开源', category: 'productivity' },
      { name: 'OnlyOffice', slug: 'onlyoffice', shortDesc: '开源办公套件', websiteUrl: 'https://www.onlyoffice.com', githubUrl: 'https://github.com/ONLYOFFICE', pricingType: 'OPEN_SOURCE', tags: '效率,办公,开源', category: 'productivity' },
      { name: 'Collabora Online', slug: 'collabora', shortDesc: '开源协作办公', websiteUrl: 'https://www.collaboraonline.com', githubUrl: 'https://github.com/CollaboraOnline/online', pricingType: 'OPEN_SOURCE', tags: '效率,办公,开源', category: 'productivity' },
      { name: 'Peppermint', slug: 'peppermint', shortDesc: '开源工单系统', websiteUrl: 'https://peppermint.sh', githubUrl: 'https://github.com/Peppermint-Lab/peppermint', pricingType: 'OPEN_SOURCE', tags: '效率,工单,开源', category: 'productivity' },
      { name: 'Frappe Helpdesk', slug: 'frappe-helpdesk', shortDesc: '开源客服系统', websiteUrl: 'https://frappe.io/helpdesk', githubUrl: 'https://github.com/frappe/helpdesk', pricingType: 'OPEN_SOURCE', tags: '效率,客服,开源', category: 'productivity' },
      { name: 'UVDesk', slug: 'uvdesk', shortDesc: '开源工单系统', websiteUrl: 'https://www.uvdesk.com', githubUrl: 'https://github.com/uvdesk/community-skeleton', pricingType: 'OPEN_SOURCE', tags: '效率,工单,开源', category: 'productivity' },
      { name: 'Chatwoot', slug: 'chatwoot', shortDesc: '开源客服平台', websiteUrl: 'https://www.chatwoot.com', githubUrl: 'https://github.com/chatwoot/chatwoot', pricingType: 'OPEN_SOURCE', tags: '效率,客服,开源', category: 'productivity' },
      { name: 'Zammad', slug: 'zammad', shortDesc: '开源工单系统', websiteUrl: 'https://zammad.org', githubUrl: 'https://github.com/zammad/zammad', pricingType: 'OPEN_SOURCE', tags: '效率,工单,开源', category: 'productivity' },
      { name: 'osTicket', slug: 'osticket', shortDesc: '开源工单系统', websiteUrl: 'https://osticket.com', githubUrl: 'https://github.com/osTicket/osTicket', pricingType: 'OPEN_SOURCE', tags: '效率,工单,开源', category: 'productivity' },
      
      // AI 研究/学术工具
      { name: 'Elicit', slug: 'elicit', shortDesc: 'AI 研究助手', websiteUrl: 'https://elicit.org', pricingType: 'FREEMIUM', tags: '研究,学术,文献', category: 'research' },
      { name: 'Consensus', slug: 'consensus', shortDesc: 'AI 科学搜索引擎', websiteUrl: 'https://consensus.app', pricingType: 'FREEMIUM', tags: '研究,学术,搜索', category: 'research' },
      { name: 'Scite', slug: 'scite', shortDesc: '智能引文分析', websiteUrl: 'https://scite.ai', pricingType: 'FREEMIUM', tags: '研究,引文,学术', category: 'research' },
      { name: 'ResearchRabbit', slug: 'researchrabbit', shortDesc: '文献发现工具', websiteUrl: 'https://www.researchrabbit.ai', pricingType: 'FREE', tags: '研究,文献,发现', category: 'research' },
      { name: 'Connected Papers', slug: 'connected-papers', shortDesc: '文献关系图谱', websiteUrl: 'https://www.connectedpapers.com', pricingType: 'FREEMIUM', tags: '研究,文献,可视化', category: 'research' },
      { name: 'Semantic Scholar', slug: 'semantic-scholar', shortDesc: 'AI 学术搜索', websiteUrl: 'https://www.semanticscholar.org', pricingType: 'FREE', tags: '研究,学术,搜索', category: 'research' },
      { name: 'Litmaps', slug: 'litmaps', shortDesc: '文献地图工具', websiteUrl: 'https://www.litmaps.com', pricingType: 'FREEMIUM', tags: '研究,文献,可视化', category: 'research' },
      { name: 'Inciteful', slug: 'inciteful', shortDesc: '文献发现平台', websiteUrl: 'https://inciteful.xyz', pricingType: 'FREE', tags: '研究,文献,发现', category: 'research' },
      { name: 'Paper Digest', slug: 'paper-digest', shortDesc: '论文摘要生成', websiteUrl: 'https://www.paper-digest.com', pricingType: 'FREE', tags: '研究,摘要,学术', category: 'research' },
      { name: 'Scholarcy', slug: 'scholarcy', shortDesc: '论文总结工具', websiteUrl: 'https://www.scholarcy.com', pricingType: 'FREEMIUM', tags: '研究,总结,学术', category: 'research' },
      { name: 'Explainpaper', slug: 'explainpaper', shortDesc: '论文解读助手', websiteUrl: 'https://www.explainpaper.com', pricingType: 'FREEMIUM', tags: '研究,解读,学术', category: 'research' },
      { name: 'Humata', slug: 'humata', shortDesc: '文档问答 AI', websiteUrl: 'https://www.humata.ai', pricingType: 'FREEMIUM', tags: '研究,问答,文档', category: 'research' },
      { name: 'ChatPDF', slug: 'chatpdf', shortDesc: 'PDF 对话工具', websiteUrl: 'https://www.chatpdf.com', pricingType: 'FREEMIUM', tags: '研究,PDF,问答', category: 'research' },
      { name: 'PDF.ai', slug: 'pdf-ai', shortDesc: 'PDF AI 助手', websiteUrl: 'https://pdf.ai', pricingType: 'FREEMIUM', tags: '研究,PDF,问答', category: 'research' },
      { name: 'Unriddle', slug: 'unriddle', shortDesc: '文献阅读助手', websiteUrl: 'https://www.unriddle.ai', pricingType: 'FREEMIUM', tags: '研究,阅读,学术', category: 'research' },
      { name: 'SciSpace', slug: 'scispace', shortDesc: '科研写作助手', websiteUrl: 'https://typeset.io', pricingType: 'FREEMIUM', tags: '研究,写作,学术', category: 'research' },
      { name: 'Jenni AI', slug: 'jenni-ai', shortDesc: '学术写作助手', websiteUrl: 'https://jenni.ai', pricingType: 'PAID', tags: '研究,写作,学术', category: 'research' },
      { name: 'Writefull', slug: 'writefull', shortDesc: '学术语言检查', websiteUrl: 'https://writefull.com', pricingType: 'FREEMIUM', tags: '研究,语言,学术', category: 'research' },
      { name: 'Paperpal', slug: 'paperpal', shortDesc: '学术写作编辑', websiteUrl: 'https://paperpal.com', pricingType: 'FREEMIUM', tags: '研究,编辑,学术', category: 'research' },
      { name: 'Trinka', slug: 'trinka', shortDesc: '学术写作助手', websiteUrl: 'https://www.trinka.ai', pricingType: 'FREEMIUM', tags: '研究,写作,学术', category: 'research' },
      { name: 'QuillBot', slug: 'quillbot', shortDesc: '改写和润色工具', websiteUrl: 'https://quillbot.com', pricingType: 'FREEMIUM', tags: '研究,改写,润色', category: 'research' },
      { name: 'Wordtune', slug: 'wordtune', shortDesc: 'AI 写作助手', websiteUrl: 'https://www.wordtune.com', pricingType: 'FREEMIUM', tags: '研究,写作,润色', category: 'research' },
      { name: 'Grammarly Academic', slug: 'grammarly-academic', shortDesc: '学术语法检查', websiteUrl: 'https://www.grammarly.com/edu', pricingType: 'PAID', tags: '研究,语法,学术', category: 'research' },
      { name: 'Zotero', slug: 'zotero', shortDesc: '开源文献管理', websiteUrl: 'https://www.zotero.org', githubUrl: 'https://github.com/zotero/zotero', pricingType: 'OPEN_SOURCE', tags: '研究,文献管理,开源', category: 'research' },
      { name: 'JabRef', slug: 'jabref', shortDesc: '开源文献管理', websiteUrl: 'https://www.jabref.org', githubUrl: 'https://github.com/JabRef/jabref', pricingType: 'OPEN_SOURCE', tags: '研究,文献管理,开源', category: 'research' },
      { name: 'Mendeley', slug: 'mendeley', shortDesc: '文献管理工具', websiteUrl: 'https://www.mendeley.com', pricingType: 'FREE', tags: '研究,文献管理,学术', category: 'research' },
      { name: 'ReadCube Papers', slug: 'readcube', shortDesc: '文献管理平台', websiteUrl: 'https://www.readcube.com', pricingType: 'PAID', tags: '研究,文献管理,学术', category: 'research' },
      { name: 'Citavi', slug: 'citavi', shortDesc: '文献管理与知识组织', websiteUrl: 'https://www.citavi.com', pricingType: 'PAID', tags: '研究,文献管理,知识', category: 'research' },
      { name: 'Paperpile', slug: 'paperpile', shortDesc: '云端文献管理', websiteUrl: 'https://paperpile.com', pricingType: 'PAID', tags: '研究,文献管理,云端', category: 'research' },
      { name: 'Colwiz', slug: 'colwiz', shortDesc: '科研协作平台', websiteUrl: 'https://www.colwiz.com', pricingType: 'FREEMIUM', tags: '研究,协作,学术', category: 'research' },
      { name: 'Overleaf', slug: 'overleaf', shortDesc: '在线 LaTeX 编辑', websiteUrl: 'https://www.overleaf.com', pricingType: 'FREEMIUM', tags: '研究,写作,LaTeX', category: 'research' },
      { name: 'Authorea', slug: 'authorea', shortDesc: '科研写作平台', websiteUrl: 'https://www.authorea.com', pricingType: 'FREEMIUM', tags: '研究,写作,协作', category: 'research' },
      { name: 'Manubot', slug: 'manubot', shortDesc: '开源学术写作', websiteUrl: 'https://manubot.org', githubUrl: 'https://github.com/manubot/manubot', pricingType: 'OPEN_SOURCE', tags: '研究,写作,开源', category: 'research' },
      { name: 'Fidus Writer', slug: 'fidus-writer', shortDesc: '开源学术编辑', websiteUrl: 'https://www.fiduswriter.org', githubUrl: 'https://github.com/fiduswriter/fiduswriter', pricingType: 'OPEN_SOURCE', tags: '研究,编辑,开源', category: 'research' },
      
      // 更多热门 AI 工具
      { name: 'Midjourney V6', slug: 'midjourney-v6', shortDesc: 'Midjourney 最新版本', websiteUrl: 'https://www.midjourney.com', pricingType: 'PAID', tags: '图像生成,艺术,专业', category: 'image' },
      { name: 'DALL-E 3', slug: 'dalle-3', shortDesc: 'OpenAI 图像生成', websiteUrl: 'https://openai.com/dall-e-3', pricingType: 'PAID', tags: '图像生成,OpenAI,艺术', category: 'image' },
      { name: 'Stable Diffusion 3', slug: 'sd3', shortDesc: 'Stability AI 最新模型', websiteUrl: 'https://stability.ai', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,最新', category: 'image' },
      { name: 'Stable Diffusion XL', slug: 'sdxl', shortDesc: 'SD 高质量版本', websiteUrl: 'https://stability.ai', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,高质量', category: 'image' },
      { name: 'FLUX', slug: 'flux', shortDesc: 'Black Forest Labs 图像模型', websiteUrl: 'https://blackforestlabs.ai', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,高质量', category: 'image' },
      { name: 'Ideogram', slug: 'ideogram', shortDesc: 'AI 图像生成（擅长文字）', websiteUrl: 'https://ideogram.ai', pricingType: 'FREE', tags: '图像生成,文字,免费', category: 'image' },
      { name: 'Recraft', slug: 'recraft', shortDesc: 'AI 矢量图生成', websiteUrl: 'https://www.recraft.ai', pricingType: 'FREEMIUM', tags: '图像生成,矢量图,设计', category: 'image' },
      { name: 'Krea AI', slug: 'krea-ai', shortDesc: '实时 AI 图像生成', websiteUrl: 'https://www.krea.ai', pricingType: 'FREEMIUM', tags: '图像生成,实时,设计', category: 'image' },
      { name: 'Magnific AI', slug: 'magnific', shortDesc: 'AI 图像放大增强', websiteUrl: 'https://magnific.ai', pricingType: 'PAID', tags: '图像处理,放大,增强', category: 'image' },
      { name: 'Fooocus', slug: 'fooocus', shortDesc: '开源图像生成界面', websiteUrl: 'https://github.com/lllyasviel/Fooocus', githubUrl: 'https://github.com/lllyasviel/Fooocus', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,界面', category: 'image' },
      { name: 'InvokeAI', slug: 'invokeai', shortDesc: '专业开源图像生成', websiteUrl: 'https://invoke-ai.github.io/InvokeAI', githubUrl: 'https://github.com/invoke-ai/InvokeAI', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,专业', category: 'image' },
      { name: 'Draw Things', slug: 'draw-things', shortDesc: 'iOS 本地图像生成', websiteUrl: 'https://drawthings.ai', pricingType: 'FREE', tags: '图像生成,本地,iOS', category: 'image' },
      { name: 'DiffusionBee', slug: 'diffusionbee', shortDesc: 'Mac 本地图像生成', websiteUrl: 'https://diffusionbee.com', pricingType: 'FREE', tags: '图像生成,本地,Mac', category: 'image' },
      { name: 'Automatic1111', slug: 'auto1111', shortDesc: 'Stable Diffusion WebUI', websiteUrl: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui', githubUrl: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,WebUI', category: 'image' },
      { name: 'SD.Next', slug: 'sd-next', shortDesc: 'SD WebUI 分支', websiteUrl: 'https://github.com/vladmandic/automatic', githubUrl: 'https://github.com/vladmandic/automatic', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,WebUI', category: 'image' },
      { name: 'StableSwarmUI', slug: 'stableswarm', shortDesc: 'Stability AI 官方界面', websiteUrl: 'https://github.com/Stability-AI/StableSwarmUI', githubUrl: 'https://github.com/Stability-AI/StableSwarmUI', pricingType: 'OPEN_SOURCE', tags: '图像生成,开源,官方', category: 'image' },
      { name: 'Ollama', slug: 'ollama', shortDesc: '本地运行大语言模型', websiteUrl: 'https://ollama.com', githubUrl: 'https://github.com/ollama/ollama', pricingType: 'OPEN_SOURCE', tags: 'LLM,本地,开源', category: 'chat' },
      { name: 'LM Studio', slug: 'lm-studio', shortDesc: '本地 LLM 桌面应用', websiteUrl: 'https://lmstudio.ai', pricingType: 'FREE', tags: 'LLM,本地,桌面', category: 'chat' },
      { name: 'GPT4All', slug: 'gpt4all', shortDesc: '本地 LLM 运行', websiteUrl: 'https://gpt4all.io', githubUrl: 'https://github.com/nomic-ai/gpt4all', pricingType: 'OPEN_SOURCE', tags: 'LLM,本地,开源', category: 'chat' },
      { name: 'LocalAI', slug: 'localai', shortDesc: '本地 OpenAI API 替代', websiteUrl: 'https://localai.io', githubUrl: 'https://github.com/mudler/LocalAI', pricingType: 'OPEN_SOURCE', tags: 'LLM,本地,API,开源', category: 'chat' },
      { name: 'Jan', slug: 'jan', shortDesc: '本地 LLM 聊天界面', websiteUrl: 'https://jan.ai', githubUrl: 'https://github.com/janhq/jan', pricingType: 'OPEN_SOURCE', tags: 'LLM,本地,开源', category: 'chat' },
      { name: 'Msty', slug: 'msty', shortDesc: '本地 AI 聊天应用', websiteUrl: 'https://msty.app', pricingType: 'FREE', tags: 'LLM,本地,桌面', category: 'chat' },
      { name: 'AnythingLLM', slug: 'anythingllm', shortDesc: '本地文档聊天', websiteUrl: 'https://useanything.com', githubUrl: 'https://github.com/Mintplex-Labs/anything-llm', pricingType: 'OPEN_SOURCE', tags: 'LLM,RAG,本地,开源', category: 'chat' },
      { name: 'MaxKB', slug: 'maxkb', shortDesc: '开源知识库问答', websiteUrl: 'https://github.com/1Panel-dev/MaxKB', githubUrl: 'https://github.com/1Panel-dev/MaxKB', pricingType: 'OPEN_SOURCE', tags: 'LLM,RAG,开源', category: 'chat' },
      { name: 'Dify', slug: 'dify', shortDesc: 'LLM 应用开发平台', websiteUrl: 'https://dify.ai', githubUrl: 'https://github.com/langgenius/dify', pricingType: 'OPEN_SOURCE', tags: 'LLM,开发,开源', category: 'chat' },
      { name: 'Flowise', slug: 'flowise', shortDesc: '可视化 LLM 工作流', websiteUrl: 'https://flowiseai.com', githubUrl: 'https://github.com/FlowiseAI/Flowise', pricingType: 'OPEN_SOURCE', tags: 'LLM,工作流,开源', category: 'chat' },
      { name: 'LangFlow', slug: 'langflow', shortDesc: 'LangChain 可视化', websiteUrl: 'https://www.langflow.org', githubUrl: 'https://github.com/langflow-ai/langflow', pricingType: 'OPEN_SOURCE', tags: 'LLM,可视化,开源', category: 'chat' },
      { name: 'Voiceflow', slug: 'voiceflow', shortDesc: '对话式 AI 设计', websiteUrl: 'https://www.voiceflow.com', pricingType: 'FREEMIUM', tags: '对话设计,AI,无代码', category: 'chat' },
      { name: 'Botpress', slug: 'botpress', shortDesc: '开源聊天机器人', websiteUrl: 'https://botpress.com', githubUrl: 'https://github.com/botpress/botpress', pricingType: 'OPEN_SOURCE', tags: '聊天机器人,开源,平台', category: 'chat' },
      { name: 'Rasa', slug: 'rasa', shortDesc: '开源对话 AI', websiteUrl: 'https://rasa.com', githubUrl: 'https://github.com/RasaHQ/rasa', pricingType: 'OPEN_SOURCE', tags: '聊天机器人,开源,企业', category: 'chat' },
      { name: 'Typebot', slug: 'typebot', shortDesc: '开源聊天机器人构建', websiteUrl: 'https://typebot.io', githubUrl: 'https://github.com/baptisteArno/typebot.io', pricingType: 'OPEN_SOURCE', tags: '聊天机器人,开源,构建', category: 'chat' },
      { name: 'Chatbot UI', slug: 'chatbot-ui', shortDesc: '开源 ChatGPT 界面', websiteUrl: 'https://www.chatbotui.com', githubUrl: 'https://github.com/mckaywrigley/chatbot-ui', pricingType: 'OPEN_SOURCE', tags: 'LLM,界面,开源', category: 'chat' },
      { name: 'Lobe Chat', slug: 'lobe-chat', shortDesc: '开源聊天应用', websiteUrl: 'https://lobehub.com', githubUrl: 'https://github.com/lobehub/lobe-chat', pricingType: 'OPEN_SOURCE', tags: 'LLM,聊天,开源', category: 'chat' },
      { name: 'ChatGPT-Next-Web', slug: 'chatgpt-next-web', shortDesc: '轻量 ChatGPT 界面', websiteUrl: 'https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web', githubUrl: 'https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web', pricingType: 'OPEN_SOURCE', tags: 'LLM,界面,开源', category: 'chat' },
      { name: 'LibreChat', slug: 'librechat', shortDesc: '开源 ChatGPT 克隆', websiteUrl: 'https://librechat.ai', githubUrl: 'https://github.com/danny-avila/LibreChat', pricingType: 'OPEN_SOURCE', tags: 'LLM,聊天,开源', category: 'chat' },
      { name: 'OpenWebUI', slug: 'openwebui', shortDesc: '开源 LLM 界面', websiteUrl: 'https://openwebui.com', githubUrl: 'https://github.com/open-webui/open-webui', pricingType: 'OPEN_SOURCE', tags: 'LLM,界面,开源', category: 'chat' },
      { name: 'Text Generation WebUI', slug: 'textgen-webui', shortDesc: '文本生成界面', websiteUrl: 'https://github.com/oobabooga/text-generation-webui', githubUrl: 'https://github.com/oobabooga/text-generation-webui', pricingType: 'OPEN_SOURCE', tags: 'LLM,界面,开源', category: 'chat' },
      { name: 'SillyTavern', slug: 'sillytavern', shortDesc: '角色扮演 LLM 界面', websiteUrl: 'https://sillytavern.app', githubUrl: 'https://github.com/SillyTavern/SillyTavern', pricingType: 'OPEN_SOURCE', tags: 'LLM,角色扮演,开源', category: 'chat' },
      { name: 'KoboldAI', slug: 'koboldai', shortDesc: '本地 AI 写作', websiteUrl: 'https://github.com/KoboldAI/KoboldAI-Client', githubUrl: 'https://github.com/KoboldAI/KoboldAI-Client', pricingType: 'OPEN_SOURCE', tags: 'LLM,写作,开源', category: 'chat' },
      { name: 'NovelAI', slug: 'novelai', shortDesc: 'AI 故事和图像', websiteUrl: 'https://novelai.net', pricingType: 'PAID', tags: 'LLM,写作,图像', category: 'chat' },
      { name: 'AI Dungeon', slug: 'ai-dungeon', shortDesc: 'AI 文字冒险', websiteUrl: 'https://aidungeon.io', pricingType: 'FREEMIUM', tags: 'LLM,游戏,冒险', category: 'chat' },
      { name: 'Character.AI', slug: 'character-ai', shortDesc: 'AI 角色对话', websiteUrl: 'https://character.ai', pricingType: 'FREE', tags: 'LLM,角色,娱乐', category: 'chat' },
      { name: 'Pi', slug: 'pi', shortDesc: '个人 AI 助手', websiteUrl: 'https://pi.ai', pricingType: 'FREE', tags: 'LLM,助手,个人', category: 'chat' },
      { name: 'Poe', slug: 'poe', shortDesc: '多模型 AI 聊天', websiteUrl: 'https://poe.com', pricingType: 'FREEMIUM', tags: 'LLM,多模型,聊天', category: 'chat' },
      { name: 'YouChat', slug: 'youchat', shortDesc: 'You.com AI 聊天', websiteUrl: 'https://you.com', pricingType: 'FREE', tags: 'LLM,搜索,聊天', category: 'chat' },
      { name: 'Perplexity', slug: 'perplexity', shortDesc: 'AI 搜索助手', websiteUrl: 'https://www.perplexity.ai', pricingType: 'FREEMIUM', tags: 'LLM,搜索,问答', category: 'chat' },
      { name: 'Le Chat', slug: 'le-chat', shortDesc: 'Mistral AI 聊天', websiteUrl: 'https://chat.mistral.ai', pricingType: 'FREE', tags: 'LLM,Mistral,聊天', category: 'chat' },
      { name: 'HuggingChat', slug: 'huggingchat', shortDesc: 'Hugging Face 聊天', websiteUrl: 'https://huggingface.co/chat', pricingType: 'FREE', tags: 'LLM,开源,聊天', category: 'chat' },
      { name: 'Claude', slug: 'claude', shortDesc: 'Anthropic AI 助手', websiteUrl: 'https://claude.ai', pricingType: 'FREEMIUM', tags: 'LLM,Claude,助手', category: 'chat' },
      { name: 'Gemini Advanced', slug: 'gemini-advanced', shortDesc: 'Google 高级 AI', websiteUrl: 'https://gemini.google.com', pricingType: 'PAID', tags: 'LLM,Gemini,高级', category: 'chat' },
      { name: 'Copilot', slug: 'copilot', shortDesc: 'Microsoft AI 助手', websiteUrl: 'https://copilot.microsoft.com', pricingType: 'FREEMIUM', tags: 'LLM,微软,助手', category: 'chat' },
      { name: 'GitHub Copilot', slug: 'github-copilot', shortDesc: 'AI 编程助手', websiteUrl: 'https://github.com/features/copilot', pricingType: 'PAID', tags: '编程,AI助手,代码', category: 'code' },
      { name: 'Amazon CodeWhisperer', slug: 'codewhisperer', shortDesc: 'AWS AI 编程', websiteUrl: 'https://aws.amazon.com/codewhisperer', pricingType: 'FREE', tags: '编程,AWS,代码', category: 'code' },
      { name: 'CodeGeeX', slug: 'codegeex', shortDesc: '智谱 AI 编程助手', websiteUrl: 'https://codegeex.cn', githubUrl: 'https://github.com/THUDM/CodeGeeX', pricingType: 'FREE', tags: '编程,开源,中文', category: 'code' },
      { name: 'Fitten Code', slug: 'fitten-code', shortDesc: '非十科技 AI 编程', websiteUrl: 'https://code.fittentech.com', pricingType: 'FREE', tags: '编程,免费,中文', category: 'code' },
      { name: 'Codeium', slug: 'codeium-2', shortDesc: '免费 AI 编程助手', websiteUrl: 'https://codeium.com', pricingType: 'FREE', tags: '编程,免费,代码补全', category: 'code' },
      { name: 'Continue', slug: 'continue', shortDesc: '开源 AI 编程助手', websiteUrl: 'https://continue.dev', githubUrl: 'https://github.com/continuedev/continue', pricingType: 'OPEN_SOURCE', tags: '编程,开源,IDE', category: 'code' },
      { name: 'Supermaven', slug: 'supermaven', shortDesc: 'AI 编程助手', websiteUrl: 'https://supermaven.com', pricingType: 'FREEMIUM', tags: '编程,代码补全,AI', category: 'code' },
      { name: 'Aider', slug: 'aider', shortDesc: '终端 AI 编程助手', websiteUrl: 'https://aider.chat', githubUrl: 'https://github.com/paul-gauthier/aider', pricingType: 'OPEN_SOURCE', tags: '编程,终端,开源', category: 'code' },
      { name: 'Cursor', slug: 'cursor', shortDesc: 'AI 原生代码编辑器', websiteUrl: 'https://cursor.sh', pricingType: 'FREEMIUM', tags: '编程,编辑器,AI', category: 'code' },
      { name: 'Windsurf', slug: 'windsurf', shortDesc: 'Codeium AI 编辑器', websiteUrl: 'https://codeium.com/windsurf', pricingType: 'FREEMIUM', tags: '编程,编辑器,AI', category: 'code' },
      { name: 'Trae', slug: 'trae', shortDesc: '字节跳动 AI 编辑器', websiteUrl: 'https://www.trae.ai', pricingType: 'FREE', tags: '编程,编辑器,字节', category: 'code' },
      { name: 'Zed', slug: 'zed', shortDesc: '高性能 AI 编辑器', websiteUrl: 'https://zed.dev', githubUrl: 'https://github.com/zed-industries/zed', pricingType: 'OPEN_SOURCE', tags: '编程,编辑器,开源', category: 'code' },
      { name: 'PearAI', slug: 'pearai', shortDesc: '开源 AI 编辑器', websiteUrl: 'https://trypear.ai', githubUrl: 'https://github.com/trypear/pearai-app', pricingType: 'OPEN_SOURCE', tags: '编程,编辑器,开源', category: 'code' },
      { name: 'Void', slug: 'void', shortDesc: '开源 Cursor 替代', websiteUrl: 'https://voideditor.com', githubUrl: 'https://github.com/voideditor/void', pricingType: 'OPEN_SOURCE', tags: '编程,编辑器,开源', category: 'code' },
      { name: 'Tabby', slug: 'tabby', shortDesc: '自托管 AI 编程', websiteUrl: 'https://tabby.tabbyml.com', githubUrl: 'https://github.com/TabbyML/tabby', pricingType: 'OPEN_SOURCE', tags: '编程,自托管,开源', category: 'code' },
      { name: 'Ollama Copilot', slug: 'ollama-copilot', shortDesc: '本地 Copilot', websiteUrl: 'https://github.com/jmorganca/ollama', githubUrl: 'https://github.com/jmorganca/ollama', pricingType: 'OPEN_SOURCE', tags: '编程,本地,开源', category: 'code' },
    ]
  }
]

// 分类映射
const categoryMap: Record<string, { name: string; slug: string; description: string }> = {
  chat: { name: 'AI聊天', slug: 'chat', description: 'AI对话助手和聊天机器人' },
  image: { name: 'AI绘画', slug: 'image', description: 'AI图像生成和编辑工具' },
  video: { name: 'AI视频', slug: 'video', description: 'AI视频生成和编辑工具' },
  audio: { name: 'AI音频', slug: 'audio', description: 'AI语音合成和音乐生成' },
  code: { name: 'AI编程', slug: 'code', description: 'AI编程助手和代码生成' },
  writing: { name: 'AI写作', slug: 'writing', description: 'AI写作和内容生成工具' },
  search: { name: 'AI搜索', slug: 'search', description: 'AI搜索引擎和问答' },
  office: { name: 'AI办公', slug: 'office', description: 'AI办公和生产力工具' },
  design: { name: 'AI设计', slug: 'design', description: 'AI设计和创意工具' },
  education: { name: 'AI教育', slug: 'education', description: 'AI教育和学习工具' },
  productivity: { name: 'AI效率', slug: 'productivity', description: 'AI效率提升工具' },
  devtool: { name: '开发工具', slug: 'devtool', description: 'AI开发工具和平台' },
  research: { name: 'AI研究', slug: 'research', description: 'AI学术研究和文献工具' },
  browser: { name: '浏览器扩展', slug: 'browser', description: 'AI浏览器扩展' },
  '3d': { name: 'AI 3D', slug: '3d', description: 'AI 3D模型生成工具' },
  data: { name: '数据分析', slug: 'data', description: 'AI数据分析和可视化' },
}

async function ensureCategories() {
  console.log('📂 确保分类存在...')
  
  for (const [key, cat] of Object.entries(categoryMap)) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      },
    })
  }
  
  console.log('✅ 分类准备完成')
}

async function importManualTools() {
  const manualSource = dataSources.find(s => s.type === 'manual')
  if (!manualSource || !manualSource.tools) return
  
  console.log(`📥 开始导入 ${manualSource.tools.length} 个手动维护的工具...`)
  
  let success = 0
  let failed = 0
  
  for (const tool of manualSource.tools) {
    try {
      // 获取分类
      const category = await prisma.category.findUnique({
        where: { slug: tool.category }
      })
      
      // 判断是否开源：有githubUrl 或 pricingType为OPEN_SOURCE
      const isOpenSource = !!(tool.githubUrl || tool.pricingType === 'OPEN_SOURCE')
      
      await prisma.tool.upsert({
        where: { slug: tool.slug },
        update: {
          name: tool.name,
          shortDesc: tool.shortDesc,
          websiteUrl: tool.websiteUrl,
          githubUrl: (tool as any).githubUrl || null,
          pricingType: tool.pricingType,
          isOpenSource: isOpenSource,
          tags: tool.tags,
          categoryId: category?.id || null,
          updatedAt: new Date(),
        },
        create: {
          name: tool.name,
          slug: tool.slug,
          shortDesc: tool.shortDesc,
          description: tool.shortDesc,
          websiteUrl: tool.websiteUrl,
          githubUrl: (tool as any).githubUrl || null,
          pricingType: tool.pricingType,
          isOpenSource: isOpenSource,
          tags: tool.tags,
          categoryId: category?.id || null,
          isActive: true,
          source: 'manual',
          publishedAt: new Date(),
        },
      })
      
      success++
      process.stdout.write('.')
    } catch (error) {
      failed++
      process.stdout.write('x')
      console.error(`\n❌ 导入 ${tool.name} 失败:`, error)
    }
  }
  
  console.log(`\n✅ 成功: ${success}, ❌ 失败: ${failed}`)
}

async function main() {
  console.log('🚀 开始批量抓取 AI 工具数据...\n')
  
  // 1. 确保分类存在
  await ensureCategories()
  
  // 2. 导入手动维护的工具列表
  await importManualTools()
  
  // 3. 更新今日趋势数据（按 upvotes 排序计算排名，写入趋势历史表）
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
  
  // 4. 统计结果
  const totalTools = await prisma.tool.count()
  const totalCategories = await prisma.category.count()
  
  console.log('\n📊 数据统计:')
  console.log(`   工具总数: ${totalTools}`)
  console.log(`   分类总数: ${totalCategories}`)
  
  // 各分类统计
  const categories = await prisma.category.findMany({
    include: { _count: { select: { tools: true } } }
  })
  
  console.log('\n📁 分类分布:')
  for (const cat of categories) {
    if (cat._count.tools > 0) {
      console.log(`   ${cat.name}: ${cat._count.tools} 个工具`)
    }
  }
  
  console.log('\n✨ 批量导入完成!')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})