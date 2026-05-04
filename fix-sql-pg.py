"""批量替换 SQLite 特定语法为 PostgreSQL 兼容语法"""
import os
import re

include_dirs = [
    r'C:\Users\Lenovo\WorkBuddy\20260407193651\src',
    r'C:\Users\Lenovo\WorkBuddy\20260407193651\scripts',
]

total_count = 0
for src_dir in include_dirs:
    for root, dirs, files in os.walk(src_dir):
        for f in files:
            if not (f.endswith('.ts') or f.endswith('.tsx')):
                continue
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            
            original = content
            
            # 1. datetime('now') → NOW()
            content = re.sub(r"datetime\('now'\)", "NOW()", content)
            
            # 2. datetime('now', '+5 minutes') → NOW() + INTERVAL '5 minutes'
            content = re.sub(r"datetime\('now', '\+(\d+) minutes'\)", r"NOW() + INTERVAL '\1 minutes'", content)
            
            # 3. strftime('%Y-%m-%dT%H:%M:%S', column) → to_char(column, 'YYYY-MM-DD"T"HH24:MI:SS')
            content = re.sub(r"strftime\('%Y-%m-%dT%H:%M:%S',\s*(\w+)\)", r"to_char(\1, 'YYYY-MM-DD\"T\"HH24:MI:SS')", content)
            
            # 4. strftime('%Y-%m-%d', column) → to_char(column, 'YYYY-MM-DD')
            content = re.sub(r"strftime\('%Y-%m-%d',\s*(\w+)\)", r"to_char(\1, 'YYYY-MM-DD')", content)
            
            if content != original:
                total_count += 1
                with open(path, 'w', encoding='utf-8') as fh:
                    fh.write(content)
                print(f'  ✓ {os.path.relpath(path)}')

print(f'\n修改完成，共处理 {total_count} 个文件')
