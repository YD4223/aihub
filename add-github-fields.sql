-- 给 users 表添加 GitHub OAuth 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS "githubId" TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "githubUsername" TEXT;
