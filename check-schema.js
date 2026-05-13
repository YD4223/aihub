const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function check() {
  try {
    // 获取第一个工具看字段名
    const tool = await p.tool.findFirst({ select: { id: true, name: true } });
    console.log('Tool fields:', Object.keys(tool));

    // 检查表结构
    const tables = await p.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='tools'`;
    console.log('Tables:', tables);

    // 直接查询所有工具的第一个看字段
    const allTools = await p.$queryRaw`SELECT * FROM tools LIMIT 1`;
    if (allTools.length > 0) {
      console.log('Tool columns:', Object.keys(allTools[0]));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}

check();
