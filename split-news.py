import sqlite3
import os
from datetime import datetime, timezone

db_path = r'C:\Users\Lenovo\WorkBuddy\20260407193651\prisma\dev.db'

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute('SELECT * FROM "news"')
rows = cursor.fetchall()
columns = [desc[0] for desc in cursor.description]

col_list = ', '.join(f'"{c}"' for c in columns)
chunk_size = 50
total = len(rows)

for chunk_start in range(0, total, chunk_size):
    chunk = rows[chunk_start:chunk_start + chunk_size]
    part = chunk_start // chunk_size + 1
    out_path = rf'C:\Users\Lenovo\WorkBuddy\20260407193651\migrate-news-part{part}.sql'
    
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'-- news: part {part}\n')
        for row in chunk:
            values = []
            for col in columns:
                val = row[col]
                if val is None:
                    values.append('NULL')
                elif isinstance(val, (int, float)) and not isinstance(val, bool):
                    if col == 'isAutoCrawled':
                        values.append('TRUE' if val else 'FALSE')
                    elif col in ('id', 'viewCount'):
                        values.append(str(val))
                    elif val > 1000000000000:
                        dt = datetime.fromtimestamp(val / 1000, tz=timezone.utc)
                        values.append("'" + dt.strftime('%Y-%m-%d %H:%M:%S') + "'")
                    else:
                        values.append(str(val))
                elif isinstance(val, str):
                    escaped = val.replace("'", "''")
                    values.append("'" + escaped + "'")
                else:
                    escaped = str(val).replace("'", "''")
                    values.append("'" + escaped + "'")
            
            val_str = ', '.join(values)
            f.write(f'INSERT INTO "news" ({col_list}) VALUES ({val_str});\n')
    
    print(f'OK part {part}: {len(chunk)} rows')

conn.close()
print(f'Done. Total {total} rows in {(total + chunk_size - 1) // chunk_size} parts')
