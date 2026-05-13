const { PrismaClient } = require('./node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fullAudit() {
  const report = [];
  const addLine = (line) => { console.log(line); report.push(line); };

  addLine('=== AIHUB 项目全面审计报告 ===');
  addLine(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

  try {
    // 1. 数据库工具统计
    addLine('📊 数据库统计:');
    const totalTools = await prisma.tool.count();
    const totalCategories = await prisma.category.count();
    const totalUsers = await prisma.user.count();
    const totalShares = await prisma.share.count();
    const totalComments = await prisma.comment.count();
    const totalNews = await prisma.news.count();

    addLine(`- 总工具数: ${totalTools}`);
    addLine(`- 总分类数: ${totalCategories}`);
    addLine(`- 总用户数: ${totalUsers}`);
    addLine(`- 总分享数: ${totalShares}`);
    addLine(`- 总评论数: ${totalComments}`);
    addLine(`- 资讯数: ${totalNews}\n`);

    // 2. 查找低活跃度工具
    addLine('🔍 低活跃度工具 (viewCount < 5):');
    const lowActiveTools = await prisma.tool.findMany({
      where: { viewCount: { lt: 5 } },
      orderBy: { viewCount: 'asc' },
      take: 20,
      select: { id: true, name: true, slug: true, viewCount: true }
    });

    if (lowActiveTools.length === 0) {
      addLine('所有工具浏览量正常 ✓');
    } else {
      lowActiveTools.forEach(tool => {
        addLine(`- ${tool.name} (${tool.slug}): 浏览量 ${tool.viewCount}`);
      });
      addLine(`\n共找到 ${lowActiveTools.length} 个低活跃度工具`);
    }
    addLine('');

    // 3. 查找无分类的工具
    addLine('❓ 未分类工具:');
    const uncategorizedTools = await prisma.tool.findMany({
      where: { categoryId: null },
      select: { id: true, name: true },
      take: 20
    });

    if (uncategorizedTools.length === 0) {
      addLine('所有工具都已分类 ✓\n');
    } else {
      uncategorizedTools.forEach(tool => {
        addLine(`- ${tool.name} (ID: ${tool.id})`);
      });
      addLine(`\n共找到 ${uncategorizedTools.length} 个未分类工具\n`);
    }

    // 4. 工具状态统计
    addLine('📈 工具状态分布:');
    const toolStatusStats = await prisma.tool.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    toolStatusStats.forEach(stat => {
      addLine(`- ${stat.status}: ${stat._count.id} 个`);
    });
    addLine('');

    // 5. 扫描临时脚本和SQL文件
    addLine('🧹 临时文件扫描:');
    const rootDir = __dirname;
    const tempPatterns = [
      /^check-.*\.js$/,
      /^test-.*\.js$/,
      /^add-.*\.js$/,
      /^fix-.*\.js$/,
      /^update-.*\.js$/,
      /^audit.*\.js$/,
      /^export-.*\.py$/,
      /^gen-.*\.js$/,
      /^migrate-.*\.js$/,
      /.*\.sql$/
    ];

    const files = fs.readdirSync(rootDir);
    const tempFiles = files.filter(file =>
      tempPatterns.some(pattern => pattern.test(file))
    );

    const auditScriptFiles = tempFiles.filter(f => f.includes('audit'));
    const migrationFiles = tempFiles.filter(f => f.includes('migrate'));
    const fixScriptFiles = tempFiles.filter(f => f.startsWith('fix-'));
    const otherTempFiles = tempFiles.filter(f =>
      !f.includes('audit') &&
      !f.includes('migrate') &&
      !f.startsWith('fix-')
    );

    addLine('\n审计脚本:');
    auditScriptFiles.forEach(file => {
      const stats = fs.statSync(path.join(rootDir, file));
      addLine(`  - ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    });

    addLine('\n数据迁移脚本:');
    migrationFiles.forEach(file => {
      const stats = fs.statSync(path.join(rootDir, file));
      addLine(`  - ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    });

    addLine('\n修复脚本:');
    fixScriptFiles.forEach(file => {
      const stats = fs.statSync(path.join(rootDir, file));
      addLine(`  - ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    });

    addLine('\n其他临时文件:');
    otherTempFiles.forEach(file => {
      const stats = fs.statSync(path.join(rootDir, file));
      addLine(`  - ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    });

    addLine(`\n共找到 ${tempFiles.length} 个临时文件`);

    // 6. 检查 logs 目录
    const logsDir = path.join(rootDir, 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      const logSize = logFiles.reduce((acc, f) => {
        return acc + fs.statSync(path.join(logsDir, f)).size;
      }, 0);
      addLine(`\n📁 日志目录: ${logFiles.length} 个文件 (${(logSize / 1024 / 1024).toFixed(2)}MB)`);
    }

    // 7. MEMORY.md 分析
    addLine('\n📝 MEMORY.md 分析:');
    const memoryPath = path.join(rootDir, '.workbuddy/memory/MEMORY.md');
    let memoryIssues = [];

    if (fs.existsSync(memoryPath)) {
      const memoryContent = fs.readFileSync(memoryPath, 'utf8');

      // 检查过时的引用
      if (memoryContent.includes('QClaw')) {
        memoryIssues.push('- QClaw API 引用可能已过时（现使用腾讯翻译）');
      }
      if (memoryContent.includes('接入 QClaw API 测试')) {
        memoryIssues.push('- 待办事项"接入 QClaw API 测试"可考虑移除或更新');
      }
      if (memoryContent.includes('SQLite')) {
        memoryIssues.push('- SQLite 引用已过时（现使用 PostgreSQL）');
      }
      if (memoryContent.includes('prisma/dev.db')) {
        memoryIssues.push('- dev.db 路径引用已过时（现使用 Supabase PostgreSQL）');
      }

      if (memoryIssues.length === 0) {
        addLine('MEMORY.md 内容正常 ✓');
      } else {
        addLine('\n发现的问题:');
        memoryIssues.forEach(issue => addLine(issue));
      }
    } else {
      addLine('MEMORY.md 不存在');
    }

    // 8. 生成总结
    addLine('\n═══════════════════════════════════════════════════════════════');
    addLine('📋 审计总结:');
    addLine('═══════════════════════════════════════════════════════════════');
    addLine(`✅ 数据库健康: ${totalTools} 个工具，${totalCategories} 个分类`);
    addLine(`⚠️  低活跃工具: ${lowActiveTools.length} 个需要关注`);
    if (uncategorizedTools.length > 0) {
      addLine(`⚠️  未分类工具: ${uncategorizedTools.length} 个需要处理`);
    }
    addLine(`🗑️  可清理文件: ${tempFiles.length} 个临时文件`);
    if (memoryIssues.length > 0) {
      addLine(`📝 记忆优化: ${memoryIssues.length} 处需要更新`);
    }
    addLine('═══════════════════════════════════════════════════════════════');

    // 返回报告内容
    return report.join('\n');

  } catch (error) {
    console.error('审计出错:', error.message);
    console.error(error.stack);
    return `审计出错: ${error.message}`;
  } finally {
    await prisma.$disconnect();
  }
}

fullAudit().then(report => {
  // 保存报告
  const today = new Date().toISOString().split('T')[0];
  const reportPath = path.join(__dirname, `AUDIT_REPORT_${today}.md`);
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📄 报告已保存到: ${reportPath}`);
});
