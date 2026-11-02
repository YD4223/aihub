/**
 * 中英翻译（多级 fallback）
 *
 * 优先级：
 *   1. 腾讯云 TMT —— 质量最好（需 TENCENT_TRANSLATE_SECRET_ID/KEY，每月有免费额度）
 *   2. 本地 Ollama —— 无额度限制（需本地启动 ollama，默认 qwen2.5:3b）
 *   3. MyMemory  —— 免费云端兜底（无需密钥；匿名约 5000 字符/天，
 *                   配置 MYMEMORY_EMAIL 可提升到约 50000 字符/天）
 *
 * 服务状态在进程内缓存：某通道失效后本次运行不再重试，避免每条都等超时。
 */

let tencentDisabled = false
let ollamaAlive: boolean | null = null
let myMemoryQuotaOut = false

function isQuotaError(err: any): boolean {
  const code = err?.code || ''
  const msg = String(err?.message || '')
  return (
    code === 'FailedOperation.NoFreeAmount' ||
    /free amount|used up|NoFreeAmount|quota/i.test(msg)
  )
}

export async function translateToChinese(text: string): Promise<string> {
  if (!text?.trim()) return ''

  const secretId = process.env.TENCENT_TRANSLATE_SECRET_ID
  const secretKey = process.env.TENCENT_TRANSLATE_SECRET_KEY

  // 1) 腾讯云 TMT
  if (secretId && secretKey && !tencentDisabled) {
    try {
      const tmtModule: any = await import('tencentcloud-sdk-nodejs-tmt')
      const tencentcloud: any = tmtModule.default || tmtModule
      const TmtClient = tencentcloud.tmt.v20180321.Client

      const client = new TmtClient({
        credential: { secretId, secretKey },
        region: 'ap-guangzhou',
        profile: {
          signMethod: 'TC3-HMAC-SHA256',
          httpProfile: { reqMethod: 'POST', reqTimeout: 30 },
        },
      })

      const result = await client.TextTranslate({
        SourceText: text,
        Source: 'en',
        Target: 'zh',
        ProjectId: 0,
      })
      if (result?.TargetText) return result.TargetText
    } catch (error: any) {
      if (isQuotaError(error)) {
        tencentDisabled = true
        console.warn('   ⚠️ 腾讯翻译本月免费额度已用完，改用备用通道')
      } else {
        console.warn(`   ⚠️ 腾讯翻译失败（${error?.code || error?.message}），改用备用通道`)
      }
    }
  }

  // 2) 本地 Ollama
  const local = await translateWithOllama(text)
  if (local) return local

  // 3) MyMemory 免费云端
  const memory = await translateWithMyMemory(text)
  if (memory) return memory

  console.warn('   ❌ 所有翻译通道均失败，本条跳过')
  return ''
}

async function translateWithOllama(text: string): Promise<string> {
  if (ollamaAlive === false) return ''

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_TRANSLATE_MODEL || 'qwen2.5:3b',
        prompt: `请将以下英文内容翻译成简洁流畅的中文摘要（100字以内）：\n\n${text}\n\n中文摘要：`,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    ollamaAlive = true
    const data: any = await res.json()
    return data?.response?.trim() || ''
  } catch (error: any) {
    if (ollamaAlive === null) {
      ollamaAlive = false
      console.warn(`   ⚠️ 本地 Ollama 不可用（${error?.message || error}），跳过`)
    }
    return ''
  }
}

async function translateWithMyMemory(text: string): Promise<string> {
  if (myMemoryQuotaOut) return ''

  const chunks = splitForTranslation(text, 450)
  const results: string[] = []

  for (const chunk of chunks) {
    try {
      const params = new URLSearchParams({ q: chunk, langpair: 'en|zh-CN' })
      if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL)

      const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, {
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: any = await res.json()

      if (data?.quotaFinished) {
        myMemoryQuotaOut = true
        console.warn('   ⚠️ MyMemory 今日额度已用完')
        return results.join('') || ''
      }

      const translated = data?.responseData?.translatedText
      if (!translated) return results.join('') || ''
      results.push(translated)

      if (chunks.length > 1) await new Promise((r) => setTimeout(r, 200))
    } catch (e: any) {
      console.warn(`   ⚠️ MyMemory 翻译失败: ${e?.message || e}`)
      return results.join('') || ''
    }
  }

  return results.join('')
}

/** 按句子切分，适配 MyMemory 单次 500 字符限制 */
function splitForTranslation(text: string, max: number): string[] {
  if (text.length <= max) return [text]

  const parts: string[] = []
  let rest = text.trim()

  while (rest.length > max) {
    let cut = rest.lastIndexOf('. ', max)
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max)
    if (cut < max * 0.5) cut = max
    parts.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) parts.push(rest)

  return parts.filter(Boolean)
}
