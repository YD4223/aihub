/**
 * 数据库瞬时错误自动重试（指数退避）
 *
 * 覆盖的「瞬时」错误：
 *  - P1001  无法连接数据库服务器（网络抖动 / Supabase Pooler 短暂不可达）
 *  - P2024  连接池超时（并发过高 / 子进程占用连接）
 *  - P1017  服务器已关闭连接
 *  - 常见网络类错误（ECONNRESET / ETIMEDOUT / ECONNREFUSED）
 *
 * 注意：仅对上述瞬时错误重试，逻辑错误（如约束冲突 P2002）会立即抛出。
 */
export function isTransientDbError(err: any): boolean {
  const code = err?.code
  const msg = String(err?.message || '')
  return (
    code === 'P1001' ||
    code === 'P2024' ||
    code === 'P1017' ||
    msg.includes("Can't reach database server") ||
    msg.includes('Timed out fetching a new connection') ||
    msg.includes('Server has closed the connection') ||
    msg.includes('Connection refused') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNREFUSED')
  )
}

/**
 * 包裹数据库操作，遇瞬时错误自动指数退避重试。
 * 默认重试 5 次，间隔 1s → 2s → 4s → 8s → 16s。
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  label = 'DB 操作'
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      if (!isTransientDbError(err) || i === retries - 1) throw err
      const wait = 1000 * Math.pow(2, i)
      console.log(`⏳ ${label} 遇到瞬时连接问题，${wait / 1000}s 后重试 (${i + 1}/${retries})...`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error('重试次数用尽')
}
