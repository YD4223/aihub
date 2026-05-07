const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // 建表
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    enabled BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  // 插入示例数据
  const count = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM announcements');
  if (Number(count[0].c) === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO announcements (text, type, "sortOrder") VALUES ($1, $2, $3)`,
      '🔥 新功能上线：现在可以在工具详情页直接提交体验分享了！', 'update', 0
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO announcements (text, type, "sortOrder") VALUES ($1, $2, $3)`,
      '🎉 社区突破 100 条分享！感谢每一位贡献者', 'event', 1
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO announcements (text, type, "sortOrder") VALUES ($1, $2, $3)`,
      '📢 工具圈已支持搜索，快速找到你感兴趣的 AI 工具', 'info', 2
    );
    console.log('✅ 表已创建，示例数据已插入');
  } else {
    console.log('✅ 表已存在，跳过示例数据');
  }
  const r = await prisma.$queryRawUnsafe('SELECT id, text, type, enabled FROM announcements ORDER BY "sortOrder"');
  console.log(JSON.stringify(r, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
