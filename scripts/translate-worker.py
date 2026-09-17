"""
翻译工作进程 - 使用腾讯云机器翻译 TMT API（纯标准库，TC3-HMAC-SHA256 签名）

说明：官方 tencentcloud SDK 的 tmt 模块打包不完整（缺 TextTranslateRequest），
故这里直接用标准库实现 TC3 签名调用 tmt.tencentcloudapi.com，去掉对 SDK 的依赖。

限制：每秒最多 4 次请求
用法：python translate-worker.py [输入json] [输出json]
"""
import sys, json, os, time, hashlib, hmac
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

for i, text in enumerate(texts):
    if not text or not text.strip():
        results[text] = text
        continue

    # 限速：每秒最多 4 次
    if i > 0 and i % 4 == 0:
        time.sleep(1)

    try:
        results[text] = translate(text)
    except Exception as e:
        print(f"WARN [{text[:40]}]: {e}", file=sys.stderr)
        results[text] = text  # 失败保留原文

json_output = json.dumps(results, ensure_ascii=True)
if output_file:
    open(output_file, 'w', encoding='utf-8').write(json_output)
else:
    print(json_output)
