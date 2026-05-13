-- 删除旧表重建（如果需要重置的话）
-- DROP TABLE IF EXISTS friend_links CASCADE;

-- 创建友情链接表（蛇形命名，与 Prisma @map 一致）
CREATE TABLE IF NOT EXISTS friend_links (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_friend_links_enabled ON friend_links(enabled);
CREATE INDEX IF NOT EXISTS idx_friend_links_sort_order ON friend_links(sort_order);
