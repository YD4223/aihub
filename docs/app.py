"""
AI Hub · 工具速查
Hugging Face Space - 从 ai999999.top 实时拉取数据
"""

# Python 3.13 移除了 audioop，但 Gradio 4.x 依赖的 pydub 需要它
# 在 import gradio 之前先提供一个空桩模块
import sys
import types
_audioop = types.ModuleType('audioop')
for _fn in ['avg','max','minmax','maxpp','avgpp','cross','mul','add','bias',
            'reverse','tomono','tostereo','findfactor','findfit','findmax',
            'lin2lin','ratecv','lin2ulaw','ulaw2lin','lin2alaw','alaw2lin',
            'lin2adpcm','adpcm2lin']:
    setattr(_audioop, _fn, lambda *a, **kw: 0 if 'count' not in _fn and 'find' not in _fn and 'cv' not in _fn else (b'', 0))
setattr(_audioop, 'getsample', lambda *a: 0)
sys.modules['audioop'] = _audioop
sys.modules['pyaudioop'] = _audioop

import gradio as gr
import json
import urllib.request
import ssl
import threading
import time

API_BASE = "https://ai999999.top/api/tools"
ALL_TOOLS = []
LOADED = False

def fetch_tools():
    global ALL_TOOLS, LOADED
    ctx = ssl.create_default_context()
    try:
        req = urllib.request.Request(f"{API_BASE}?limit=1&page=1")
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            total = json.loads(resp.read().decode()).get("total", 0)
        if total == 0:
            return
        all_t, limit = [], 200
        for p in range(1, (total + limit - 1) // limit + 1):
            try:
                req = urllib.request.Request(f"{API_BASE}?limit={limit}&page={p}&sort=newest")
                with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                    for t in json.loads(resp.read().decode()).get("tools", []):
                        all_t.append({
                            "name": t.get("name", ""),
                            "desc": (t.get("shortDesc") or t.get("description", ""))[:120],
                            "slug": t.get("slug", ""),
                            "cat": t.get("category", {}).get("name", "其他工具") if t.get("category") else "其他工具",
                        })
            except:
                pass
        ALL_TOOLS = all_t
        LOADED = True
        print(f"✅ {len(ALL_TOOLS)} 工具已加载")
    except Exception as e:
        print(f"❌ 加载失败: {e}")

# 后台线程加载数据，不阻塞界面
threading.Thread(target=fetch_tools, daemon=True).start()

def do_search(query, cat, page):
    if not LOADED:
        return '<div style="padding:2rem;text-align:center;color:#888;">📡 正在加载 900+ 工具数据，请稍候...</div>'
    q = query.lower().strip()
    hits = [t for t in ALL_TOOLS
            if (cat == "全部" or t["cat"] == cat)
            and (not q or q in t["name"].lower() or q in t["desc"].lower())]
    per = 20
    tp = max(1, (len(hits) + per - 1) // per)
    p = max(1, min(page, tp))
    batch = hits[(p-1)*per:p*per]
    return _fmt(batch, len(hits), p, tp)

def _fmt(items, total, page, total_pages):
    if not items:
        return '<div style="padding:2rem;text-align:center;color:#888;">🔍 没有匹配的工具</div>'
    cards = "".join(
        f'''<div style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;padding:0.85rem 1.1rem;margin-bottom:0.5rem;transition:all .2s"
                onmouseover="this.style.borderColor='#00ff88';this.style.transform='translateX(4px)'"
                onmouseout="this.style.borderColor='#2a2a4a';this.style.transform='none'">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <span style="font-size:1rem;font-weight:600;color:#e0e0e0;">{t["name"]}</span>
                    <span style="margin-left:0.4rem;font-size:0.7rem;padding:0.15rem 0.5rem;border-radius:4px;background:#00d4ff18;color:#00d4ff;border:1px solid #00d4ff30">{t["cat"]}</span>
                </div>
                <a href="https://ai999999.top/tools/{t["slug"]}" target="_blank" style="text-decoration:none;padding:0.3rem 0.8rem;border-radius:6px;background:#00ff88;color:#0a0a0f;font-size:0.8rem;font-weight:600;white-space:nowrap"
                   onmouseover="this.style.boxShadow='0 0 12px #00ff8860'" onmouseout="this.style.boxShadow='none'">查看 →</a>
            </div>
            <div style="margin-top:0.35rem;font-size:0.82rem;color:#a0a0b0;">{t["desc"][:100]}</div>
        </div>'''
        for t in items
    )
    return f'<div style="display:flex;justify-content:space-between;padding:0.5rem 0;color:#666;font-size:0.85rem;"><span>共 {total} 个工具 · 第 {page}/{total_pages} 页</span></div>{cards}'

CSS = """
.gradio-container { background: #0a0a0f !important; max-width: 960px !important; margin: 0 auto; }
footer { display: none !important; }
"""

with gr.Blocks(css=CSS, theme=gr.themes.Base()) as demo:
    gr.Markdown(
        f"""<div style="text-align:center;padding:2rem 0 1rem;">
<div style="font-size:2.5rem;font-weight:800;letter-spacing:2px;color:#e0e0e0;"><span style="color:#00ff88;">AI</span> Hub <span style="font-size:1rem;color:#666;font-weight:400;">· 工具速查</span></div>
<div style="color:#666;font-size:0.9rem;margin-top:0.3rem;" id="status">📡 正在加载工具数据...</div></div>"""
    )

    search_input = gr.Textbox(label="", placeholder="🔍 搜索工具名称或用途...", container=False)
    search_btn = gr.Button("搜索", variant="primary")
    
    cat_state = gr.State("全部")
    results = gr.HTML()

    # 分类按钮
    with gr.Row():
        gr.Button("🔥 全部", size="sm").click(
            fn=lambda: ("全部", do_search("", "全部", 1)),
            outputs=[cat_state, results]
        )

    # 初始状态
    results.value = '<div style="padding:2rem;text-align:center;color:#888;">📡 正在加载 900+ 工具数据，请稍候...</div>'

    # 搜索事件
    def srch(q, cat):
        return do_search(q, cat, 1)
    search_btn.click(fn=srch, inputs=[search_input, cat_state], outputs=[results])
    search_input.submit(fn=srch, inputs=[search_input, cat_state], outputs=[results])

    gr.Markdown(
        """<div style="text-align:center;padding:2rem 0 0.5rem;border-top:1px solid #1a1a2e;margin-top:2rem;">
<a href="https://ai999999.top" target="_blank" style="display:inline-block;padding:0.6rem 2rem;border-radius:8px;background:#12121a;border:1px solid #2a2a3a;color:#00ff88;text-decoration:none;font-weight:600;"
   onmouseover="this.style.borderColor='#00ff88';this.style.boxShadow='0 0 20px #00ff8830'" onmouseout="this.style.borderColor='#2a2a3a';this.style.boxShadow='none'">
🌐 浏览全部工具 →</a>
<div style="margin-top:0.8rem;font-size:0.75rem;color:#444;">ai999999.top · AI 工具导航站</div></div>"""
    )

if __name__ == "__main__":
    demo.launch()
