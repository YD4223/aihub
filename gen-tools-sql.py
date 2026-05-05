"""生成 PostgreSQL 兼容的工具数据 SQL（多份小文件）"""
import sqlite3
import os
from datetime import datetime, timezone

db_path = r'C:\Users\Lenovo\WorkBuddy\20260407193651\prisma\dev.db'
output_dir = r'C:\Users\Lenovo\WorkBuddy\20260407193651'

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute('SELECT * FROM "tools"')
rows = cursor.fetchall()
columns = [desc[0] for desc in cursor.description]

col_list = ', '.join(f'"{c}"' for c in columns)

# 布尔列
bool_cols = {'isOpenSource', 'isFeatured', 'isActive'}
# 时间戳列
ts_cols = {'createdAt', 'updatedAt', 'reviewedAt', 'publishedAt', 'suspendedAt'}

total = len(rows)
chunk_size = 50
chunk_num = 0

for chunk_start in range(0, total, chunk_size):
    chunk = rows[chunk_start:chunk_start + chunk_size]
    chunk_num += 1
    out_path = os.path.join(output_dir, f'migrate-tools-part{chunk_num}.sql')
    
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'-- tools: part {chunk_num} (rows {chunk_start+1}-{min(chunk_start+chunk_size, total)})\n')
        for row in chunk:
            values = []
            for col in columns:
                val = row[col]
                if val is None:
                    values.append('NULL')
                elif isinstance(val, (int, float)) and not isinstance(val, bool):
                    if col in bool_cols:
                        values.append('TRUE' if val else 'FALSE')
                    elif col in ts_cols and val > 1000000000000:
                        dt = datetime.fromtimestamp(val / 1000, tz=timezone.utc)
                        values.append("'" + dt.strftime('%Y-%m-%d %H:%M:%S') + "'")
                    else:
                        values.append(str(val))
                elif isinstance(val, str):
                    # 关键：双重转义单引号
                    escaped = val.replace("'", "''")
                    values.append("'" + escaped + "'")
                elif isinstance(val, bool):
                    values.append('TRUE' if val else 'FALSE')
                else:
                    escaped = str(val).replace("'", "''")
                    values.append("'" + escaped + "'")
            
            val_str = ', '.join(values)
            f.write(f'INSERT INTO "tools" ({col_list}) VALUES ({val_str});\n')
    
    print(f'  ✅ part {chunk_num}: {len(chunk)} rows ({chunk_start+1}-{min(chunk_start+chunk_size, total)})')

conn.close()
print(f'\nDone. Total {total} rows in {chunk_num} parts')
print(f'Import: migrate-tools-part1.sql → part{chunk_num}.sql')
