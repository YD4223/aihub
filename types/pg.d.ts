/**
 * pg 的最小类型声明。
 * 项目未安装 @types/pg（本机 npm 拉取会长时间无响应），
 * 这里只声明 scripts/ 下实际用到的 API，避免为一个小脚本引入额外依赖。
 * 若将来安装了 @types/pg，删除本文件即可。
 */
declare module 'pg' {
  export interface PgClientConfig {
    connectionString?: string
    ssl?: { rejectUnauthorized: boolean } | boolean
    connectionTimeoutMillis?: number
  }

  export class Client {
    constructor(config?: PgClientConfig)
    connect(): Promise<void>
    query<T = Record<string, unknown>>(
      sql: string,
      values?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number | null }>
    end(): Promise<void>
  }
}
