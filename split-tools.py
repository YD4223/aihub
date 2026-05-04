"""拆分较大的 SQL 数据文件为多个小文件"""
import os

sql_path = r'C:\Users\Lenovo\WorkBuddy\20260407193651\migrate-step2-data-tools.sql'
output_dir = r'C:\Users\Lenovo\WorkBuddy\20260407193651'

with open(sql_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 按 100 条一组拆分
statements = [l for l in lines if l.startswith('INSERT INTO')]
total = len(statements)
chunk_size = 100

for i in range(0, total, chunk_size):
    chunk = statements[i:i+chunk_size]
    chunk_num = i // chunk_size + 1
    output_path = os.path.join(output_dir, f'migrate-step2-data-tools-part{chunk_num}.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f'-- tools: batch {chunk_num} (rows {i+1}-{min(i+chunk_size, total)})\n')
        f.writelines(chunk)
    print(f'  ✅ tools part {chunk_num}: {len(chunk)} 条 → migrate-step2-data-tools-part{chunk_num}.sql')

print(f'\n✅ 拆分完成！共 {total} 条，分 { (total + chunk_size - 1) // chunk_size } 份')
print(f'   按 migrate-step2-data-tools-part1.sql 到 part{ (total + chunk_size - 1) // chunk_size }.sql 依次导入')
