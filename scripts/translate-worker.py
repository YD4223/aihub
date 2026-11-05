"""
翻译工作进程 - 多级 fallback：腾讯云 TMT → MyMemory 免费接口

说明：官方 tencentcloud SDK 的 tmt 模块打包不完整（缺 TextTranslateRequest），
故腾讯通道用标准库实现 TC3 签名；腾讯额度用尽时自动降级到 MyMemory。

限制：每秒最多 4 次请求
用法：python translate-worker.py [输入json] [输出json]
环境变量：TENCENT_TRANSLATE_SECRET_ID / _KEY、MYMEMORY_EMAIL（可选，提升配额）
"""
import sys, json, os, time, hashlib, hmac
import urllib.parse
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# ---------- 从 .env 读取密钥 ----------
SECRET_ID = ''
SECRET_KEY = ''
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
# 显式 UTF-8 读取（Windows 默认 GBK，.env 含中文注释会解码失败）
for line in open(env_path, encoding='utf-8', errors='ignore'):
    line = line.strip()
    if line.startswith('TENCENT_TRANSLATE_SECRET_ID='):
        SECRET_ID = line.split('=', 1)[1].strip().strip('"\'')
    elif line.startswith('TENCENT_TRANSLATE_SECRET_KEY='):
        SECRET_KEY = line.split('=', 1)[1].strip().strip('"\'')
# 兼容环境变量传入
SECRET_ID = SECRET_ID or os.environ.get('TENCENT_TRANSLATE_SECRET_ID', '')
SECRET_KEY = SECRET_KEY or os.environ.get('TENCENT_TRANSLATE_SECRET_KEY', '')

if not SECRET_ID or not SECRET_KEY:
    print('ERROR: 需要 TENCENT_TRANSLATE_SECRET_ID 和 TENCENT_TRANSLATE_SECRET_KEY', file=sys.stderr)
    sys.exit(1)

HOST = 'tmt.tencentcloudapi.com'
SERVICE = 'tmt'
ACTION = 'TextTranslate'
VERSION = '2018-03-21'
REGION = 'ap-guangzhou'


def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()


def _sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def tc3_post(payload: dict) -> dict:
    """用 TC3-HMAC-SHA256 签名 POST 调用腾讯云 API"""
    ts = int(time.time())
    date = time.strftime('%Y-%m-%d', time.gmtime(ts))
    algorithm = 'TC3-HMAC-SHA256'
    ct = 'application/json; charset=utf-8'

    body = json.dumps(payload)  # ensure_ascii=True，纯 ASCII，签名与请求体一致

    # 1. 拼接规范请求串
    canonical_headers = f'content-type:{ct}\nhost:{HOST}\n'
    signed_headers = 'content-type;host'
    canonical_request = '\n'.join([
        'POST', '/', '', canonical_headers, signed_headers, _sha256_hex(body),
    ])

    # 2. 拼接待签名字符串
    credential_scope = f'{date}/{SERVICE}/tc3_request'
    string_to_sign = '\n'.join([algorithm, str(ts), credential_scope, _sha256_hex(canonical_request)])

    # 3. 计算签名
    secret_date = _hmac_sha256(('TC3' + SECRET_KEY).encode('utf-8'), date)
    secret_service = _hmac_sha256(secret_date, SERVICE)
    secret_signing = _hmac_sha256(secret_service, 'tc3_request')
    signature = hmac.new(secret_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    # 4. 拼接 Authorization
    authorization = (
        f'{algorithm} Credential={SECRET_ID}/{credential_scope}, '
        f'SignedHeaders={signed_headers}, Signature={signature}'
    )

    headers = {
        'Authorization': authorization,
        'Content-Type': ct,
        'Host': HOST,
        'X-TC-Action': ACTION,
        'X-TC-Timestamp': str(ts),
        'X-TC-Version': VERSION,
        'X-TC-Region': REGION,
    }

    req = Request(f'https://{HOST}', data=body.encode('utf-8'), headers=headers, method='POST')
    try:
        with urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except HTTPError as e:
        raw = e.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'HTTP {e.code}: {raw[:200]}')


def translate(text: str) -> str:
    r = tc3_post({'SourceText': text[:2000], 'Source': 'en', 'Target': 'zh', 'ProjectId': 0})
    resp = r.get('Response', {})
    if 'Error' in resp:
        raise RuntimeError(f"{resp['Error'].get('Code')}: {resp['Error'].get('Message')}")
    return resp.get('TargetText', text)


# ---------- 读取输入 ----------
input_file = sys.argv[1] if len(sys.argv) > 1 else None
output_file = sys.argv[2] if len(sys.argv) > 2 else None
if input_file:
    lines = open(input_file, 'r', encoding='utf-8').read().strip()
else:
    lines = sys.stdin.read().strip()

if not lines:
    sys.exit(0)

texts = json.loads(lines)
results = {}

# 通道状态（进程内缓存，避免每条重复重试已失效的通道）
tencent_disabled = False
mymemory_quota_out = False
mymemory_fail_streak = 0
MYMEMORY_MAX_FAIL_STREAK = 2


def translate_with_mymemory(text):
    """MyMemory 免费翻译（无需密钥，云端兜底）。单次 ≤500 字符。"""
    global mymemory_quota_out, mymemory_fail_streak
    if mymemory_quota_out:
        return ''

    chunks = split_for_translation(text, 450)
    parts = []

    for chunk in chunks:
        params = {'q': chunk, 'langpair': 'en|zh-CN'}
        email = os.environ.get('MYMEMORY_EMAIL', '')
        if email:
            params['de'] = email

        url = 'https://api.mymemory.translated.net/get?' + urllib.parse.urlencode(params)
        try:
            # 正常响应 1-2s；8s 未回基本可判定不可用，避免逐条干等
            with urlopen(url, timeout=8) as resp:
                data = json.loads(resp.read().decode('utf-8'))
        except HTTPError as e:
            if e.code == 429:
                mymemory_quota_out = True
                print('WARN: MyMemory 免费额度已用尽（约 24 小时后恢复）', file=sys.stderr)
                return ''.join(parts) or ''
            mymemory_fail_streak += 1
            print(f'WARN: MyMemory HTTP {e.code} ({mymemory_fail_streak}/{MYMEMORY_MAX_FAIL_STREAK})', file=sys.stderr)
            if mymemory_fail_streak >= MYMEMORY_MAX_FAIL_STREAK:
                mymemory_quota_out = True
                print('WARN: MyMemory 连续失败，已熔断', file=sys.stderr)
            return ''.join(parts) or ''
        except Exception as e:
            mymemory_fail_streak += 1
            print(f'WARN: MyMemory 失败 {e} ({mymemory_fail_streak}/{MYMEMORY_MAX_FAIL_STREAK})', file=sys.stderr)
            if mymemory_fail_streak >= MYMEMORY_MAX_FAIL_STREAK:
                mymemory_quota_out = True
                print('WARN: MyMemory 连续失败，已熔断', file=sys.stderr)
            return ''.join(parts) or ''

        translated = (data.get('responseData') or {}).get('translatedText') or ''
        if data.get('quotaFinished') or 'MYMEMORY WARNING' in translated or data.get('responseStatus') == 429:
            mymemory_quota_out = True
            print('WARN: MyMemory 免费额度已用尽（约 24 小时后恢复）', file=sys.stderr)
            return ''.join(parts) or ''

        if not translated:
            return ''.join(parts) or ''
        mymemory_fail_streak = 0
        parts.append(translated)

        if len(chunks) > 1:
            time.sleep(0.25)

    return ''.join(parts)


def split_for_translation(text, max_len):
    """按句子切分，适配 MyMemory 单次 500 字符限制"""
    if len(text) <= max_len:
        return [text]

    parts = []
    rest = text.strip()
    while len(rest) > max_len:
        cut = rest.rfind('. ', 0, max_len)
        if cut < max_len * 0.5:
            cut = rest.rfind(' ', 0, max_len)
        if cut < max_len * 0.5:
            cut = max_len
        parts.append(rest[:cut + 1].strip())
        rest = rest[cut + 1:].strip()
    if rest:
        parts.append(rest)
    return [p for p in parts if p]


for i, text in enumerate(texts):
    if not text or not text.strip():
        results[text] = text
        continue

    # 限速：每秒最多 4 次
    if i > 0 and i % 4 == 0:
        time.sleep(1)

    out = ''

    # 1) 腾讯 TMT（质量最好）
    if not tencent_disabled:
        try:
            out = translate(text)
        except Exception as e:
            msg = str(e)
            if 'NoFreeAmount' in msg or 'free amount' in msg.lower() or 'quota' in msg.lower():
                tencent_disabled = True
                print('WARN: 腾讯翻译本月免费额度已用完，改用 MyMemory', file=sys.stderr)
            else:
                print(f'WARN [{text[:40]}]: {e}', file=sys.stderr)

    # 2) MyMemory 兜底
    if not out:
        out = translate_with_mymemory(text)

    results[text] = out or text  # 全部失败保留原文

json_output = json.dumps(results, ensure_ascii=True)
if output_file:
    open(output_file, 'w', encoding='utf-8').write(json_output)
else:
    print(json_output)
