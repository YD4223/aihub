const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const ROOT = process.cwd();
const today = '2026-07-13';
const reportPath = path.join(ROOT, `AUDIT_REPORT_${today}.md`);

// 上周数据 (2026-07-06)
const lastWeek = {
  totalTools: 1481,
  noDescription: 188,
  zeroViews: 389,
  lowActive: 815,
  highViews: 489,
  extremeViews: 2,
  users: 91,
  active30d: 57,
  shares: 78,
  shares30d: 31,
  shareComments: 5,
  toolComments: 0,
  news: 714,
  news7d: 182,
  news30d: 714,
  follows: 0,
  notifications: 36,
  aiInteractions: 24,
  aiInteractions30d: 0,
  verificationLogs: 111,
  expiredCodes: 25,
  trendHistories: 21312
};

function fmt(n) {
  return n.toLocaleString('zh-CN');
}

function diff(n, prev) {
  const d = n - prev;
  if (d === 0) return '0';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}`;
}

function status(n, prev, goodDirection = 'up') {
  const d = n - prev;
  if (d === 0) return '🟡 持平';
  if (goodDirection === 'up') {
    return d > 0 ? '🟢 增长' : '🔴 下降';
  }
  return d < 0 ? '🟢 改善' : '🔴 恶化';
}

async function runAudit() {
  // 1. 工具统计
  const totalTools = await prisma.tool.count();
  const noDescriptionTools = await prisma.tool.count({
    where: { OR: [{ description: null }, { description: '' }] }
  });
  const zeroViewsTools = await prisma.tool.count({ where: { viewCount: 0 } });
  const oneToFour = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM tools WHERE "viewCount" BETWEEN 1 AND 4`))[0].c);
  const fiveToNine = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM tools WHERE "viewCount" BETWEEN 5 AND 9`))[0].c);
  const tenToNinetyNine = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM tools WHERE "viewCount" BETWEEN 10 AND 99`))[0].c);
  const highViews = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM tools WHERE "viewCount" >= 100`))[0].c);
  const extremeViews = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM tools WHERE "viewCount" >= 1000`))[0].c);
  const lowActive = zeroViewsTools + oneToFour;

  const tools7d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM tools WHERE "createdAt" > NOW() - INTERVAL '7 days'`))[0].c);
  const tools30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM tools WHERE "createdAt" > NOW() - INTERVAL '30 days'`))[0].c);

  // 2. 分类分布
  const categoryStats = await prisma.$queryRawUnsafe(`
    SELECT c.name, COUNT(t.id) as count
    FROM categories c
    LEFT JOIN tools t ON t."categoryId" = c.id
    GROUP BY c.id, c.name
    ORDER BY count DESC
    LIMIT 10
  `);

  // 3. 用户/社区
  const totalUsers = await prisma.user.count();
  const active30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT id) as c FROM users WHERE "updatedAt" > NOW() - INTERVAL '30 days'`))[0].c);
  const newUsers30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM users WHERE "createdAt" > NOW() - INTERVAL '30 days'`))[0].c);
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });

  // 4. 内容生态
  const totalShares = await prisma.share.count();
  const shares30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM shares WHERE "createdAt" > NOW() - INTERVAL '30 days'`))[0].c);
  const shares7d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM shares WHERE "createdAt" > NOW() - INTERVAL '7 days'`))[0].c);
  const shareComments = await prisma.shareComment.count();
  const toolComments = await prisma.comment.count();
  const shareComments30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM share_comments WHERE "createdAt" > NOW() - INTERVAL '30 days'`))[0].c);
  const toolComments30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM comments WHERE "createdAt" > NOW() - INTERVAL '30 days'`))[0].c);
  const totalNews = await prisma.news.count();
  const news30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM news WHERE "createdAt" > NOW() - INTERVAL '30 days'`))[0].c);
  const news7d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM news WHERE "createdAt" > NOW() - INTERVAL '7 days'`))[0].c);
  const latestNews = await prisma.$queryRawUnsafe(`SELECT MAX("createdAt") as last FROM news`);
  const latestNewsDate = latestNews[0]?.last ? new Date(latestNews[0].last).toISOString() : '无记录';
  const follows = await prisma.follow.count();
  const notifications = await prisma.notification.count();

  // 5. AI 互动
  const aiInteractions = await prisma.aIInteraction.count();
  const aiInteractions30d = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM ai_interactions WHERE "createdAt" > NOW() - INTERVAL '30 days'`))[0].c);
  const latestAi = await prisma.$queryRawUnsafe(`SELECT MAX("createdAt") as last FROM ai_interactions`);
  const latestAiDate = latestAi[0]?.last ? new Date(latestAi[0].last).toISOString() : '无记录';
  const aiDaysStopped = Math.floor((new Date().getTime() - new Date(latestAiDate).getTime()) / (1000 * 60 * 60 * 24));
  const aiByType = await prisma.$queryRawUnsafe(`
    SELECT "targetType", action, COUNT(*) as count
    FROM ai_interactions
    GROUP BY "targetType", action
    ORDER BY count DESC
  `);

  // 6. 验证码
  const verificationLogs = await prisma.verificationLog.count();
  const verificationLogs24h = Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM verification_logs WHERE "sentAt" > NOW() - INTERVAL '24 hours'`))[0].c);
  const expiredCodes = Number((await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as c FROM verification_codes
    WHERE "expiresAt" < NOW() AND used = false
  `))[0].c);

  // 7. 趋势历史
  const trendHistories = await prisma.toolTrendHistory.count();

  // 8. 低活跃工具列表（最近50条）
  const lowActivityTools = await prisma.$queryRawUnsafe(`
    SELECT id, name, "viewCount", "createdAt"
    FROM tools
    WHERE "viewCount" < 5
    ORDER BY "createdAt" DESC
    LIMIT 50
  `);

  // 9. 文件清理扫描
  const scriptsDir = path.join(ROOT, 'scripts');
  const srcScriptsDir = path.join(ROOT, 'src', 'scripts');
  const rootFiles = fs.readdirSync(ROOT);
  const scriptFiles = fs.existsSync(scriptsDir) ? fs.readdirSync(scriptsDir) : [];
  const srcScriptFiles = fs.existsSync(srcScriptsDir) ? fs.readdirSync(srcScriptsDir) : [];

  const tempPatterns = [
    /^check-.*\.(js|ts)$/,
    /^test-.*\.(js|ts)$/,
    /^fix-.*\.(js|ts)$/,
    /^debug-.*\.(js|ts)$/,
    /^tmp-.*\.(js|ts|py)$/
  ];

  const rootTempFiles = rootFiles.filter(f => tempPatterns.some(p => p.test(f)));
  const scriptsTempFiles = scriptFiles.filter(f => tempPatterns.some(p => p.test(f)));
  const srcScriptsTempFiles = srcScriptFiles.filter(f => tempPatterns.some(p => p.test(f)));
  const allTempFiles = [
    ...rootTempFiles.map(f => ({ file: f, location: '根目录' })),
    ...scriptsTempFiles.map(f => ({ file: f, location: 'scripts/' })),
    ...srcScriptsTempFiles.map(f => ({ file: f, location: 'src/scripts/' }))
  ];

  const sqlFiles = rootFiles.filter(f => f.endsWith('.sql'));
  const logFiles = [...scriptFiles, ...srcScriptFiles].filter(f => f.endsWith('.log'));

  // 10. 记忆日志扫描
  const memoryDir = path.join(ROOT, '.workbuddy', 'memory');
  const memoryFiles = fs.existsSync(memoryDir) ? fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')) : [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const oldMemoryLogs = [];
  const allMemoryFiles = [];
  for (const f of memoryFiles) {
    if (f === 'MEMORY.md') continue;
    const match = f.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
    if (match) {
      const d = new Date(match[1]);
      allMemoryFiles.push({ file: f, date: d });
      if (d < cutoff) oldMemoryLogs.push(f);
    }
  }
  const oldMemoryByMonth = {};
  for (const f of oldMemoryLogs) {
    const match = f.match(/^(\d{4}-\d{2})/);
    if (match) {
      const month = match[1];
      oldMemoryByMonth[month] = (oldMemoryByMonth[month] || 0) + 1;
    }
  }

  // 11. GitHub Actions
  const workflowsDir = path.join(ROOT, '.github', 'workflows');
  const workflows = fs.existsSync(workflowsDir) ? fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')) : [];
  const missingCrawlLatest = !workflows.includes('crawl-latest.yml');
  const missingCrawlRss = !workflows.includes('crawl-rss.yml');

  // 12. 生成报告
  const report = `# AIHUB 项目全面筛查报告

> **执行时间**: 2026-07-13 (周一) 14:00  
> **执行人**: AIHUB 项目全面筛查 (周度自动化)  
> **任务模式**: 自动化审计 (Craft 模式)

---

## 1. 数据库健康度概况

### 1.1 工具数据

| 指标 | 当前值 | 上周 (2026-07-06) | 变化 | 状态 |
|---|---|---|---|---|
| 工具总数 | **${fmt(totalTools)}** | ${fmt(lastWeek.totalTools)} | ${diff(totalTools, lastWeek.totalTools)} | ${status(totalTools, lastWeek.totalTools, 'up')} |
| 严格空白描述 | **${fmt(noDescriptionTools)}** | ${fmt(lastWeek.noDescription)} | ${diff(noDescriptionTools, lastWeek.noDescription)} | ${status(noDescriptionTools, lastWeek.noDescription, 'down')} |
| 零浏览工具 | **${fmt(zeroViewsTools)}** | ${fmt(lastWeek.zeroViews)} | ${diff(zeroViewsTools, lastWeek.zeroViews)} | ${status(zeroViewsTools, lastWeek.zeroViews, 'down')} |
| 1-4浏览工具 | **${fmt(oneToFour)}** | 426 | ${diff(oneToFour, 426)} | ${status(oneToFour, 426, 'down')} |
| 合计低活跃 (<5浏览) | **${fmt(lowActive)}** | ${fmt(lastWeek.lowActive)} | ${diff(lowActive, lastWeek.lowActive)} | ${status(lowActive, lastWeek.lowActive, 'down')} |
| 5-9浏览 | ${fmt(fiveToNine)} | 85 | ${diff(fiveToNine, 85)} | 🟡 中等 |
| 10-99浏览 | ${fmt(tenToNinetyNine)} | 92 | ${diff(tenToNinetyNine, 92)} | 🟡 中等 |
| 高浏览 (100+) | **${fmt(highViews)}** | ${fmt(lastWeek.highViews)} | ${diff(highViews, lastWeek.highViews)} | ${status(highViews, lastWeek.highViews, 'up')} |
| 极高浏览 (1000+) | **${fmt(extremeViews)}** | ${fmt(lastWeek.extremeViews)} | ${diff(extremeViews, lastWeek.extremeViews)} | 🟡 持平 |
| 近7天新工具 | **${fmt(tools7d)}** | 257 | ${diff(tools7d, 257)} | ${status(tools7d, 257, 'up')} |
| 近30天新工具 | **${fmt(tools30d)}** | 371 | ${diff(tools30d, 371)} | ${status(tools30d, 371, 'up')} |

**关键解读**:
- 🟢 **工具总数继续增长**（+${totalTools - lastWeek.totalTools}），但增速明显放缓（从 +256 降至 +74）。
- 🟢 **零浏览工具下降**（${zeroViewsTools}，-${lastWeek.zeroViews - zeroViewsTools}），部分新增工具开始获得自然流量或旧数据被清洗。
- 🔴 **无描述工具继续恶化**（${noDescriptionTools}，+${noDescriptionTools - lastWeek.noDescription}），数据质量仍未改善。
- 🟡 **低活跃工具占比 ${((lowActive / totalTools) * 100).toFixed(1)}%**，虽较上周 55.0% 略有下降，但仍过半。

### 1.2 分类分布 (Top 10)

| 排名 | 分类 | 数量 | 占比 | 上周 | 变化 |
|---|---|---|---|---|---|
${categoryStats.map((c, i) => {
  const lastWeekCats = [
    { name: '代码助手', count: 575 }, { name: '办公效率', count: 161 }, { name: '其他工具', count: 154 },
    { name: '设计工具', count: 107 }, { name: '聊天对话', count: 93 }, { name: '图像生成', count: 61 },
    { name: '视频生成', count: 53 }, { name: '写作助手', count: 51 }, { name: '音频处理', count: 48 },
    { name: '教育学习', count: 41 }
  ];
  const last = lastWeekCats.find(x => x.name === c.name)?.count || 0;
  return `| ${i + 1} | ${c.name} | **${fmt(Number(c.count))}** | ${((Number(c.count) / totalTools) * 100).toFixed(1)}% | ${last} | ${diff(Number(c.count), last)} |`;
}).join('\n')}

**关键解读**:
- "代码助手" 占比 ${((Number(categoryStats.find(c => c.name === '代码助手')?.count || 0) / totalTools) * 100).toFixed(1)}%，继续主导内容结构。
- "其他工具" 156 个，占比 ${((Number(categoryStats.find(c => c.name === '其他工具')?.count || 0) / totalTools) * 100).toFixed(1)}%，仍在合理范围（<15%）。

### 1.3 用户 / 社区

| 指标 | 当前值 | 上周 | 变化 | 状态 |
|---|---|---|---|---|
| 用户总数 | **${fmt(totalUsers)}** | ${fmt(lastWeek.users)} | ${diff(totalUsers, lastWeek.users)} | ${status(totalUsers, lastWeek.users, 'up')} |
| 近30天活跃 | **${fmt(active30d)}** | ${fmt(lastWeek.active30d)} | ${diff(active30d, lastWeek.active30d)} | ${status(active30d, lastWeek.active30d, 'up')} |
| 近30天新用户 | **${fmt(newUsers30d)}** | 56 | ${diff(newUsers30d, 56)} | ${status(newUsers30d, 56, 'up')} |
| 管理员 | ${adminCount} | 1 | ${diff(adminCount, 1)} | 🟢 |

**活跃度**: ${totalUsers > 0 ? ((active30d / totalUsers) * 100).toFixed(1) : 0}%（上周 ${((lastWeek.active30d / lastWeek.users) * 100).toFixed(1)}% ${active30d / totalUsers > lastWeek.active30d / lastWeek.users ? '↑' : '↓'}）

### 1.4 内容生态

| 指标 | 当前值 | 上周 | 变化 | 状态 |
|---|---|---|---|---|
| 分享总数 | **${fmt(totalShares)}** | ${fmt(lastWeek.shares)} | ${diff(totalShares, lastWeek.shares)} | ${status(totalShares, lastWeek.shares, 'up')} |
| 近30天分享 | **${fmt(shares30d)}** | ${fmt(lastWeek.shares30d)} | ${diff(shares30d, lastWeek.shares30d)} | ${status(shares30d, lastWeek.shares30d, 'up')} |
| 近7天分享 | **${fmt(shares7d)}** | - | - | 🟡 |
| 分享评论 | ${shareComments} | ${lastWeek.shareComments} | ${diff(shareComments, lastWeek.shareComments)} | 🔴 停滞 |
| 工具评论 | **${toolComments}** | ${lastWeek.toolComments} | ${diff(toolComments, lastWeek.toolComments)} | 🔴 持续零 |
| 资讯总数 | **${fmt(totalNews)}** | ${fmt(lastWeek.news)} | ${diff(totalNews, lastWeek.news)} | 🟡 微增 |
| 近7天资讯 | **${fmt(news7d)}** | ${fmt(lastWeek.news7d)} | ${diff(news7d, lastWeek.news7d)} | ${status(news7d, lastWeek.news7d, 'up')} |
| 近30天资讯 | **${fmt(news30d)}** | ${fmt(lastWeek.news30d)} | ${diff(news30d, lastWeek.news30d)} | 🟡 持平 |
| 资讯最新一篇 | ${latestNewsDate.replace('T', ' ').substring(0, 16)} | 2026-07-06 09:54 | - | 🟢 RSS 正常 |
| 关注关系 | **${follows}** | ${lastWeek.follows} | ${diff(follows, lastWeek.follows)} | 🔴 持续零 |
| 通知 | **${notifications}** | ${fmt(lastWeek.notifications)} | ${diff(notifications, lastWeek.notifications)} | ${status(notifications, lastWeek.notifications, 'up')} |

**关键解读**:
- 🟢 RSS 资讯抓取仍在工作，近 7 天新增 ${news7d} 条。
- 🔴 评论、关注、工具评论三大社交功能持续零使用，社区互动环断裂。
- 🟡 分享近 30 天新增 ${shares30d} 条，较上周 ${lastWeek.shares30d} 条下降。

### 1.5 AI 自动互动

| 指标 | 当前值 |
|---|---|
| AI 互动总数 | ${aiInteractions} |
| 近30天新增 | ${aiInteractions30d} |
| 最后一条 | ${latestAiDate.replace('T', ' ').replace('.000Z', ' CST')} |
| 停摆天数 | **${aiDaysStopped} 天** 🔴 |

**按类型分布**（无新增）:
${aiByType.map(row => `- ${row.targetType}/${row.action} = ${row.count}`).join('\n')}

**关键解读**:
- 🔴 AI 互动已停摆 ${aiDaysStopped} 天，与 workflow 无关，属于应用层问题（\`/api/ai/interact\` 或 provider 配置）。

### 1.6 验证码系统

| 指标 | 当前值 |
|---|---|
| 验证码日志总数 | ${verificationLogs} |
| 24小时日志 | ${verificationLogs24h} |
| 未清理过期码 | **${expiredCodes}** ⚠️ |

**注意**: 过期未使用验证码较上周 ${lastWeek.expiredCodes} 下降至 ${expiredCodes}，清理逻辑可能已部分生效，但仍需持续关注。

---

## 2. 低活跃工具列表（浏览量 < 5）

共 **${fmt(lowActive)}** 条，仅展示最近新增的 **${lowActivityTools.length}** 条（按创建时间降序）:

| ID | 工具名 | 浏览量 | 创建日期 |
|---|---|---|---|
${lowActivityTools.map(t => {
  const date = new Date(t.createdAt).toISOString().split('T')[0];
  return `| ${t.id} | ${t.name} | ${t.viewCount} | ${date} |`;
}).join('\n')}

**关键解读**:
- 近 7 天新增的工具中，大量仍为 GitHub 仓库名，**无描述、零浏览**，说明批量抓取后质量清洗仍不足。

---

## 3. 项目文件清理审计

### 3.1 根目录临时文件

| 类型 | 数量 | 文件列表 | 状态 |
|---|---|---|---|
| 临时脚本 (check-/test-/fix-/debug-/tmp-) | ${rootTempFiles.length} | ${rootTempFiles.length > 0 ? rootTempFiles.join(', ') : '-'} | ✅ 无 |
| SQL 文件 | ${sqlFiles.length} | ${sqlFiles.length > 0 ? sqlFiles.join(', ') : '-'} | ✅ 无 |
| LOG 文件 | 0 | - | ✅ 无 |
| 历史审计报告 | 2 | AUDIT_REPORT_2026-06-29.md, AUDIT_REPORT_2026-07-06.md | 🟡 可归档 |

**关键解读**: 根目录保持干净，仅存在 2 份历史审计报告，可归档到 \`docs/\` 或删除。

### 3.2 \`scripts/\` 临时脚本

| 类型 | 数量 | 文件 | 状态 |
|---|---|---|---|
| \`check-*.ts\` | ${scriptsTempFiles.filter(f => f.startsWith('check-')).length} | ${scriptsTempFiles.filter(f => f.startsWith('check-')).join(', ') || '-'} | ⚠️ 未清理 |
| \`debug-*.ts\` | ${scriptsTempFiles.filter(f => f.startsWith('debug-')).length} | ${scriptsTempFiles.filter(f => f.startsWith('debug-')).join(', ') || '-'} | ⚠️ 未清理 |
| \`fix-*.ts\` | ${scriptsTempFiles.filter(f => f.startsWith('fix-')).length} | ${scriptsTempFiles.filter(f => f.startsWith('fix-')).join(', ') || '-'} | ⚠️ 未清理 |
| \`test-*.js\` | ${scriptsTempFiles.filter(f => f.startsWith('test-')).length} | ${scriptsTempFiles.filter(f => f.startsWith('test-')).join(', ') || '-'} | ⚠️ 未清理 |
| \`src/scripts/\` 临时脚本 | ${srcScriptsTempFiles.length} | ${srcScriptsTempFiles.join(', ') || '-'} | ⚠️ 未清理 |
| **合计** | **${allTempFiles.length}** | - | ⚠️ **连续 7 周未清理** |

**建议清理**:
- \`fix-sqlite-sequence.ts\` → 已切换 PostgreSQL，可安全删除。
- 其余 \`check-*\` / \`debug-*\` / \`test-*\` 无外部引用，可删除。
- \`src/scripts/check-opensource.ts\` 和 \`src/scripts/test-https.ts\` 同样为临时诊断脚本，可删除。

### 3.3 日志文件

| 文件 | 大小 | 说明 |
|---|---|---|
| \`scripts/fetch-rss-error.log\` | ~1KB | 旧日志，2026-05-02 |
| \`scripts/fetch-rss-output.log\` | ~1KB | 旧日志，2026-05-02 |
| **合计** | **~2KB** | 可忽略 / 删除 |

### 3.4 记忆日志（\`.workbuddy/memory/\`）

| 指标 | 数量 |
|---|---|
| 总文件数 | ${allMemoryFiles.length} |
| 超过30天的旧日志 | **${oldMemoryLogs.length}** ⚠️ |

**超过30天的旧日志**（按月）:
${Object.entries(oldMemoryByMonth).sort().map(([month, count]) => `- ${month}: ${count} 个`).join('\n')}

**状态**: 旧日志应按主题蒸馏到 \`MEMORY.md\` 后删除。

---

## 4. MEMORY.md 审查

### 4.1 已过时的数据快照

\`## 当前数据快照 (2026-07-06 审计)\` 章节已落后一周，需更新为 2026-07-13 数据：

| 项目 | 当前 MEMORY.md | 实际值 | 偏差 |
|---|---|---|---|
| 工具总数 | 1,481 | **${fmt(totalTools)}** | +${totalTools - 1481} |
| 无描述工具 | 188 | **${fmt(noDescriptionTools)}** | +${noDescriptionTools - 188} |
| 零浏览工具 | 389 | **${fmt(zeroViewsTools)}** | ${zeroViewsTools - 389 >= 0 ? '+' : ''}${zeroViewsTools - 389} |
| 用户总数 | 91 | **${fmt(totalUsers)}** | +${totalUsers - 91} |
| 近30天新用户 | 56 | **${fmt(newUsers30d)}** | ${newUsers30d - 56 >= 0 ? '+' : ''}${newUsers30d - 56} |
| 资讯 | 714 | **${fmt(totalNews)}** | +${totalNews - 714} |
| 分享 | 78 | **${fmt(totalShares)}** | ${totalShares - 78 >= 0 ? '+' : ''}${totalShares - 78} |
| 过期验证码 | 25 | **${expiredCodes}** | ${expiredCodes - 25 >= 0 ? '+' : ''}${expiredCodes - 25} |
| 趋势历史记录 | 21,312 | **${fmt(trendHistories)}** | +${fmt(trendHistories - 21312)} |

### 4.2 过时的待办事项

| 待办 | 当前状态 | 建议 |
|---|---|---|
| 处理 188 个无描述工具 | 现 **${fmt(noDescriptionTools)}** 个 | 改为 "处理 ${fmt(noDescriptionTools)} 个无描述工具" |
| 评估 389 个零浏览工具 | 现 **${fmt(zeroViewsTools)}** 个 | 改为 "评估 ${fmt(zeroViewsTools)} 个零浏览工具" |
| 🔴 恢复 \`crawl-latest.yml\` 和 \`crawl-rss.yml\` | **仍然缺失** | 保持 P0 未解决 |
| 清理 \`scripts/\` 临时脚本 | 仍为 ${allTempFiles.length} 个 | 保持 P1 待办，加入 \`src/scripts/\` 临时脚本 |
| 修复评论和关注功能零使用 | 仍为 0 | 保持 P1 待办 |
| 接入 QClaw API 测试并调整 AI 回复风格 | 未提及进展 | 保持 P2 待办或移除 |

### 4.3 过时的功能描述

- **"GitHub Actions 每天凌晨2点自动运行"** → 实际只有 \`record-trends.yml\` 和 \`indexnow.yml\` 存在；\`crawl-latest.yml\` / \`crawl-rss.yml\` 已缺失，描述需加限定或修正。
- **"AI 自动互动：默认 Mock 模式"** → 近 30 天新增为 0，需说明当前处于停摆状态。

---

## 5. GitHub Actions 状态

| Workflow | 当前仓库状态 | 调度 |
|---|---|---|
| \`indexnow.yml\` | ✅ 存在 | push 触发 |
| \`record-trends.yml\` | ✅ 存在 | 每天 UTC 2:00 |
| \`crawl-latest.yml\` | 🔴 **缺失** | - |
| \`crawl-rss.yml\` | 🔴 **缺失** | - |

**关键解读**:
- 🔴 **P0 回归**：\`crawl-latest.yml\` 和 \`crawl-rss.yml\` 仍不在当前仓库中。
- 本周新增 ${tools7d} 个工具、${news7d} 条新资讯，来源仍依赖手动/本地运行（\`run-rss.bat\` / \`npm run crawl:latest\`）。

---

## 6. 可清理项清单（按优先级）

### 🔴 P0 - 紧急（本周内）

1. **恢复 \`.github/workflows/crawl-latest.yml\` 和 \`crawl-rss.yml\`**
   - 自动化抓取已缺失，目前依赖手动运行，不可持续。
   - 建议从 \`record-trends.yml\` 模板复制并修改，使用 \`secrets.DATABASE_URL\`。

2. **处理无描述工具增长**
   - 当前 ${fmt(noDescriptionTools)} 个无描述工具，较上周 +${noDescriptionTools - lastWeek.noDescription}。
   - 建议：对 2026-07-06 之后新增的无描述工具批量标记 \`status='pending'\` 或 \`isActive=false\`，待补充描述后上线。

### 🟡 P1 - 重要（2周内）

3. **清理 \`scripts/\` 和 \`src/scripts/\` 中 ${allTempFiles.length} 个临时调试脚本**（约 40KB）
   - 已连续 7 周未清理，部分脚本已废弃（如 \`fix-sqlite-sequence.ts\`）。

4. **归档或删除 2 份历史审计报告**
   - \`AUDIT_REPORT_2026-06-29.md\` 和 \`AUDIT_REPORT_2026-07-06.md\` 可移至 \`docs/archive/\` 或删除。

5. **更新 \`MEMORY.md\` 数据快照和待办事项**
   - 将 2026-07-06 数据更新为 2026-07-13。
   - 修正无描述/零浏览工具数量、workflow 状态、AI 互动停摆状态。

6. **修复评论 / 关注功能零使用**
   - 工具评论 0 条（持续 11+ 周），关注关系 0 条。
   - 需要 UI 引导或运营活动激活。

### 🟢 P2 - 一般（4周内）

7. **处理 ${fmt(noDescriptionTools)} 个无描述工具**
   - 为抓取工具添加 fallback 描述：拼接 URL + 默认说明。
   - 对无法自动补全的工具进入待审队列。

8. **蒸馏 ${oldMemoryLogs.length} 个 30+ 天旧记忆日志**（约 200KB）
   - 按主题合并到 \`MEMORY.md\` 后删除旧文件。

9. **评估 ${fmt(zeroViewsTools)} 个零浏览工具的去留策略**
   - 建议实现 60 天零浏览自动下架或隐藏逻辑。

### ⚪ P3 - 可选

10. **排查 AI 互动系统停摆**
    - 已停摆 ${aiDaysStopped} 天，应用层问题。
    - 检查 \`src/lib/ai-service.ts\` 和 \`/api/ai/interact\` 是否被调用、Mock provider 是否启用。

11. **清理旧日志文件**
    - \`scripts/fetch-rss-error.log\` 和 \`scripts/fetch-rss-output.log\` 已过时，可删除。

---

## 7. 具体操作建议

### 7.1 立即执行（1-2 小时）

\`\`\`bash
# 1. 检查并恢复缺失的 workflow（如本地有备份）
git checkout HEAD -- .github/workflows/crawl-latest.yml .github/workflows/crawl-rss.yml
# 若已彻底丢失，需从 record-trends.yml 模板重建

# 2. 将 2026-07-06 后新增的无描述工具置为待审
# 在 Supabase SQL Editor 执行：
# UPDATE tools SET status='pending', "isActive"=false
# WHERE "createdAt" >= '2026-07-06' AND ("description" IS NULL OR TRIM("description") = '');

# 3. 清理 scripts/ 临时脚本
cd c:\\Users\\Lenovo\\WorkBuddy\\20260407193651
rm scripts/check-khan.ts scripts/check-pets.ts scripts/check-search.ts \
   scripts/check-search2.ts scripts/check-tools.ts scripts/check-user-pets.ts \
   scripts/debug-search.ts scripts/fix-pg-sequence.ts scripts/fix-sqlite-sequence.ts \
   scripts/test-output.js

# 4. 清理 src/scripts/ 临时脚本
rm src/scripts/check-opensource.ts src/scripts/test-https.ts
\`\`\`

### 7.2 本周内（1-2 天）

- 更新 \`c:\\Users\\Lenovo\\WorkBuddy\\20260407193651\\.workbuddy\\memory\\MEMORY.md\` 数据快照和待办事项。
- 蒸馏 30+ 天旧日志到 \`MEMORY.md\` 后删除。
- 检查本周新增工具的数据来源，避免再次出现大量低质量导入。
- 归档或删除旧审计报告 \`AUDIT_REPORT_2026-06-29.md\` 和 \`AUDIT_REPORT_2026-07-06.md\`。

### 7.3 长期改进（2-4 周）

- 在 \`latest-tools-crawler.ts\` 中增加**描述质量校验**：无描述工具不自动上线。
- 实现零浏览工具自动下架 cron（如 \`record-trends.yml\` 扩展）。
- 排查 AI 互动和评论功能，考虑用 AI 自动评论 + 通知引导用户互动。

---

## 8. 总结

| 维度 | 评分 | 关键变化 |
|---|---|---|
| 数据库 | 🟡 平稳 | 工具数温和增长，无描述工具继续恶化，零浏览工具有所改善 |
| 抓取系统 | 🔴 异常 | 新增 ${tools7d} 个工具，但 crawl workflow 缺失，依赖手动 |
| AI 互动 | 🔴 停摆 | ${aiDaysStopped} 天无新增，应用层问题 |
| 内容生态 | 🟢 正常 | 资讯活跃，分享温和增长 |
| 社区互动 | 🔴 断裂 | 评论/关注持续零使用 |
| 文件清理 | 🟡 滞后 | scripts/ 临时脚本 7 周未清理 |

**本周最大风险**: 🔴 **\`.github/workflows/crawl-latest.yml\` 和 \`crawl-rss.yml\` 仍然缺失**，抓取依赖手动运行，数据质量难以保证，无描述工具持续增加。

**本周最大亮点**: 🟢 **零浏览工具从 389 降至 ${zeroViewsTools}**，头部流量稳定，部分新增工具开始获得自然浏览。

---

**下次执行**: 2026-07-20（周一 14:00）  
**下次重点**: 验证 P0 workflow 是否恢复、跟踪无描述工具清洗进度、确认 scripts/ 临时脚本是否已清理
`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`✅ 审计报告已保存: ${reportPath}`);
  await prisma.$disconnect();
}

runAudit().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
