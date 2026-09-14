#!/bin/bash
# IndexNow 推送脚本（纯 curl，零依赖）
# 用法: bash src/scripts/indexnow.sh <limit>
#        bash src/scripts/indexnow.sh --url "https://..."

SITE_HOST="ai999999.top"
SITEMAP_URL="https://ai999999.top/sitemap.xml"

# 从 .env 读取 INDEXNOW_KEY（若环境中未提供）
if [ -z "${INDEXNOW_KEY:-}" ] && [ -f .env ]; then
  INDEXNOW_KEY=$(grep -E '^INDEXNOW_KEY=' .env | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//; s/["'\'']$//')
fi
if [ -z "${INDEXNOW_KEY:-}" ]; then
  echo "❌ 缺少环境变量 INDEXNOW_KEY（请在 .env 中配置，或先 export 后重试）"
  exit 1
fi
PRIMARY_API="https://api.indexnow.org/indexnow"
FALLBACK_API="https://www.bing.com/indexnow"

BATCH_SIZE=5
MAX_RETRIES=3
REQUEST_TIMEOUT=30

echo "══════════════════════════════════════════"
echo "  IndexNow 推送工具 (bash)"
echo "  站点: $SITE_HOST"
echo "  主端点: $PRIMARY_API"
echo "  备选: $FALLBACK_API"
echo "══════════════════════════════════════════"
echo ""

# ---------- helper: JSON 字符串转义 ----------
json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/\r//g'
}

# ---------- helper: 单次 curl POST（返回 HTTP 状态码） ----------
# 参数：batch_items_json api_url
# 全局变量传出：CURL_EXIT_CODE, CURL_VERBOSE_FILE
curl_post_batch() {
  local batch_items=$1
  local api_url=$2
  local payload="{\"host\":\"$SITE_HOST\",\"key\":\"$INDEXNOW_KEY\",\"keyLocation\":\"https://$SITE_HOST/$INDEXNOW_KEY.txt\",\"urlList\":$batch_items}"

  CURL_VERBOSE_FILE=$(mktemp /tmp/indexnow_verbose.XXXXXX)
  local resp_body_file=$(mktemp /tmp/indexnow_body.XXXXXX)

  HTTP_CODE=$(curl -s -o "$resp_body_file" \
    -w "%{http_code}" \
    -X POST "$api_url" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time "$REQUEST_TIMEOUT" \
    2>"$CURL_VERBOSE_FILE")

  CURL_EXIT_CODE=$?

  # 读取响应体并清理
  RESP_BODY=$(cat "$resp_body_file" 2>/dev/null || echo "")
  rm -f "$resp_body_file"

  # 打印错误详情（如果失败）
  if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "202" ] || [ "$CURL_EXIT_CODE" -ne 0 ]; then
    echo "    curl exit code: $CURL_EXIT_CODE"
    echo "    HTTP status: ${HTTP_CODE:-"(no response)"}"
    # 截取 curl 错误信息
    local curl_err
    curl_err=$(head -30 "$CURL_VERBOSE_FILE" 2>/dev/null | grep -i "curl\|error\|failed\|SSL\|connect\|timeout\|resolve" || echo "(no error detail)")
    if [ -n "$curl_err" ]; then
      echo "    curl诊断: $curl_err"
    fi
    # 打印完整 verbose（限制 40 行）
    local verbose_len
    verbose_len=$(wc -l < "$CURL_VERBOSE_FILE" 2>/dev/null || echo 0)
    if [ "$verbose_len" -gt 0 ]; then
      echo "    ─── curl verbose (head 40) ───"
      head -40 "$CURL_VERBOSE_FILE" | sed 's/^/    /'
      echo "    ───────────────────────────────"
    fi
    # 打印响应体
    if [ -n "$RESP_BODY" ]; then
      echo "    响应体: ${RESP_BODY:0:200}"
    fi
  fi

  rm -f "$CURL_VERBOSE_FILE"
  return 0
}

# ---------- helper: 提交一批 URL（带重试 + 备选端点） ----------
submit_batch() {
  local batch_items=$1
  local batch_label=$2
  local api_url=$3

  local retry=0
  while [ $retry -le "$MAX_RETRIES" ]; do
    curl_post_batch "$batch_items" "$api_url"

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
      return 0
    fi

    retry=$((retry + 1))
    if [ $retry -le "$MAX_RETRIES" ]; then
      local wait=$((2 ** retry))
      echo "    🔄 重试 $retry/$MAX_RETRIES（等待 ${wait}s）..."
      sleep "$wait"
    fi
  done

  return 1
}

# ---------- 单条推送 ----------
if [ "${1:-}" = "--url" ] && [ -n "${2:-}" ]; then
  echo "📤 推送单条: $2"
  SINGLE_ITEMS="[\"$(json_escape "$2")\"]"
  if submit_batch "$SINGLE_ITEMS" "single" "$PRIMARY_API"; then
    echo "✅ 推送成功"
    exit 0
  else
    echo ""
    echo "⚠️ 主端点失败，尝试备选端点..."
    if submit_batch "$SINGLE_ITEMS" "single" "$FALLBACK_API"; then
      echo "✅ 备选端点推送成功"
      exit 0
    else
      echo "❌ 推送失败（主端点 + 备选端点均已尝试）"
      exit 1
    fi
  fi
fi

# ---------- 获取 sitemap ----------
echo "📡 读取 sitemap..."
SITEMAP_XML=$(curl -s --max-time 15 "$SITEMAP_URL" || echo "")
if [ -z "$SITEMAP_XML" ]; then
  echo "❌ 无法获取 sitemap（$SITEMAP_URL）"
  exit 1
fi

# 提取 <loc> 内容
URLS=$(echo "$SITEMAP_XML" | sed -n 's/.*<loc>\([^<]*\)<\/loc>.*/\1/p')
TOTAL=$(echo "$URLS" | sed '/^$/d' | wc -l)
echo "✅ 解析到 $TOTAL 条 URL"

LIMIT="${1:-}"
if [ -n "$LIMIT" ] && [ "$LIMIT" -gt 0 ] 2>/dev/null; then
  URLS=$(echo "$URLS" | head -n "$LIMIT")
  TOTAL=$LIMIT
  echo "📐 截取前 $LIMIT 条"
fi

echo ""
echo "🚀 开始推送 $TOTAL 条（每批 $BATCH_SIZE 条，最多重试 $MAX_RETRIES 次，超时 ${REQUEST_TIMEOUT}s）"
echo "  策略: 主端点失败 → 备选端点 → 标记失败"
echo ""

# ---------- 分批提交 ----------
echo "$URLS" > /tmp/indexnow_urls.txt
TOTAL_BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

SUCCESS=0
FAILED=0
COUNT=0
BATCH_NUM=0
USE_FALLBACK=false

while IFS= read -r url; do
  [ -z "$url" ] && continue

  COUNT=$((COUNT + 1))

  # 第一批或满批时才提交
  if [ "$COUNT" -eq 1 ]; then
    BATCH_ITEMS="[\"$(json_escape "$url")\""
  elif [ $((COUNT % BATCH_SIZE)) -eq 1 ]; then
    # 提交上一批
    BATCH_ITEMS="${BATCH_ITEMS}]"
    BATCH_NUM=$((BATCH_NUM + 1))
    printf "  [%d/%d] " "$BATCH_NUM" "$TOTAL_BATCHES"

    # 决定使用哪个端点
    if [ "$USE_FALLBACK" = true ]; then
      API_TARGET="$FALLBACK_API"
      echo -n "(备选) "
    else
      API_TARGET="$PRIMARY_API"
    fi

    if submit_batch "$BATCH_ITEMS" "$BATCH_NUM" "$API_TARGET"; then
      echo "✅ $BATCH_SIZE 条"
      SUCCESS=$((SUCCESS + BATCH_SIZE))
    else
      # 如果主端点失败且尚未启用备选，切换备选
      if [ "$USE_FALLBACK" = false ]; then
        echo "⚠️ 主端点失败，切换到备选..."
        USE_FALLBACK=true
        API_TARGET="$FALLBACK_API"
        if submit_batch "$BATCH_ITEMS" "$BATCH_NUM" "$API_TARGET"; then
          echo "✅ $BATCH_SIZE 条（备选）"
          SUCCESS=$((SUCCESS + BATCH_SIZE))
        else
          echo "❌ $BATCH_SIZE 条（主端点 + 备选均失败）"
          FAILED=$((FAILED + BATCH_SIZE))
        fi
      else
        echo "❌ $BATCH_SIZE 条（备选也失败）"
        FAILED=$((FAILED + BATCH_SIZE))
      fi
    fi

    # 新一批
    BATCH_ITEMS="[\"$(json_escape "$url")\""
  else
    BATCH_ITEMS="${BATCH_ITEMS},\"$(json_escape "$url")\""
  fi

done < /tmp/indexnow_urls.txt

# 处理最后一批
if [ -n "${BATCH_ITEMS:-}" ] && echo "$BATCH_ITEMS" | grep -q '"' ; then
  LAST_COUNT=$((TOTAL % BATCH_SIZE == 0 ? BATCH_SIZE : TOTAL % BATCH_SIZE))
  BATCH_ITEMS="${BATCH_ITEMS}]"
  BATCH_NUM=$((BATCH_NUM + 1))
  printf "  [%d/%d] " "$BATCH_NUM" "$TOTAL_BATCHES"

  if [ "$USE_FALLBACK" = true ]; then
    API_TARGET="$FALLBACK_API"
    echo -n "(备选) "
  else
    API_TARGET="$PRIMARY_API"
  fi

  if submit_batch "$BATCH_ITEMS" "$BATCH_NUM" "$API_TARGET"; then
    echo "✅ $LAST_COUNT 条"
    SUCCESS=$((SUCCESS + LAST_COUNT))
  else
    if [ "$USE_FALLBACK" = false ]; then
      echo "⚠️ 主端点失败，切换到备选..."
      USE_FALLBACK=true
      if submit_batch "$BATCH_ITEMS" "$BATCH_NUM" "$FALLBACK_API"; then
        echo "✅ $LAST_COUNT 条（备选）"
        SUCCESS=$((SUCCESS + LAST_COUNT))
      else
        echo "❌ $LAST_COUNT 条（均失败）"
        FAILED=$((FAILED + LAST_COUNT))
      fi
    else
      echo "❌ $LAST_COUNT 条（备选也失败）"
      FAILED=$((FAILED + LAST_COUNT))
    fi
  fi
fi

rm -f /tmp/indexnow_urls.txt

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ 成功: $SUCCESS"
if [ "$FAILED" -gt 0 ]; then echo "  ❌ 失败: $FAILED"; fi
echo "  📊 总计: $((SUCCESS + FAILED))"
echo "══════════════════════════════════════════"

if [ "$FAILED" -gt 0 ]; then exit 1; fi
exit 0
