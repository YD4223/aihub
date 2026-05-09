const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // 先查admin的用户id
  const admins = await prisma.$queryRawUnsafe('SELECT id FROM users WHERE role = $1 LIMIT 1', 'ADMIN');
  const adminId = Number(admins[0].id);
  console.log('站长ID:', adminId);
  // 给站长今天发的、还没置顶的帖子补上置顶24小时
  const r = await prisma.$executeRawUnsafe(
    `UPDATE shares SET "pinnedUntil" = NOW() + INTERVAL '24 hours' WHERE "userId" = $1 AND "pinnedUntil" IS NULL AND "createdAt" > NOW() - INTERVAL '24 hours'`,
    adminId
  );
  console.log('✅ 更新了', r, '条记录');
  // 验证
  const shares = await prisma.$queryRawUnsafe('SELECT id, content, "pinnedUntil" FROM shares WHERE "userId" = $1 AND "pinnedUntil" IS NOT NULL ORDER BY id DESC LIMIT 5', adminId);
  console.log(JSON.stringify(shares, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
