/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'ph-files.imgix.net', 'avatars.githubusercontent.com', 'logo.clearbit.com', 'www.google.com'],
    unoptimized: true,
  },
  env: {
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy — 去掉了 'unsafe-eval'（生产不需要），加严 script 来源
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",           // unsafe-eval 已移除
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",                 // 禁止 iframe 嵌套
              "base-uri 'self'",                         // 防止 base 标签劫持
              "form-action 'self'",                      // 限制表单提交目标
            ].join('; ')
          },
          // 禁止 MIME 类型嗅探
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // 禁止页面被嵌入 iframe（防 clickjacking）
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // 控制 Referrer 头 — 跨域只传 origin
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 防止 HTTP 降级
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // 禁用自动推测（减少 XSS 面）
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          // 阻止 IE 兼容模式
          {
            key: 'X-XSS-Protection',
            value: '0',  // 禁用已废弃的 XSS 过滤器（现代浏览器用 CSP 替代）
          },
        ]
      },
      // API 路由 — 通用头（不加 Cache-Control，让具体路由自行控制）
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ]
      },
      // 管理后台 API — 不缓存
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ]
      }
    ]
  },

  async redirects() {
    return [
      {
        source: '/category/:slug',
        destination: '/tools?category=:slug',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
