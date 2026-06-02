# AI Hub - 全球AI工具聚合平台

一个聚合全球AI工具、开源项目和AI资讯的平台，对标AIbase + 知乎模式。

TG频道：t.me/AT9966s

## 功能特性

- 🤖 **AI工具库** - 按分类浏览、搜索、筛选AI工具
- 📰 **AI资讯** - 全球AI行业动态聚合
- 🔥 **趋势榜单** - 日/周/月热门工具排行
- 💬 **社区讨论** - 知乎式问答和讨论
- 🌟 **开源项目** - GitHub热门AI项目追踪
- 🕷️ **自动抓取** - 定时抓取Product Hunt、GitHub等平台数据

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes + Prisma
- **数据库**: PostgreSQL
- **爬虫**: Puppeteer + GitHub Actions
- **部署**: Vercel (免费)

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd ai-aggregator
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接
```

### 4. 初始化数据库

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
ai-aggregator/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (site)/          # 前台页面
│   │   │   ├── page.tsx     # 首页
│   │   │   ├── tools/       # 工具列表/详情
│   │   │   ├── news/        # 资讯
│   │   │   └── trending/    # 趋势榜
│   │   └── admin/           # 后台管理
│   ├── components/          # 组件
│   ├── lib/                 # 工具函数
│   ├── prisma/              # 数据库Schema
│   └── scripts/             # 爬虫脚本
├── .github/workflows/       # CI/CD
└── package.json
```

## 爬虫配置

爬虫通过GitHub Actions定时运行，每天凌晨2点自动抓取：

- Product Hunt - AI分类新品
- GitHub Trending - AI相关项目

手动触发：

```bash
npm run crawl
```

## 部署

### Vercel部署（推荐）

1. 推送代码到GitHub
2. 在Vercel导入项目
3. 配置环境变量 `DATABASE_URL`
4. 自动部署

### 数据库

免费PostgreSQL选项：
- Railway (每月$5免费额度)
- Supabase (免费 tier)
- Neon (免费 tier)

## 路线图

- [x] 基础框架搭建
- [x] 数据库设计
- [x] 首页UI
- [x] 工具列表/详情页
- [ ] 资讯模块
- [ ] 用户系统
- [ ] 评论功能
- [ ] 后台管理
- [ ] 爬虫自动化
- [ ] SEO优化
- [ ] PWA支持

## 贡献

欢迎提交Issue和PR！

## 许可证

MIT
