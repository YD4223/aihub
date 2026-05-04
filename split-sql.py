"""拆分 large SQL 文件为小份：建表 + 每个表单独一份"""
import re

sql_path = r'C:\Users\Lenovo\WorkBuddy\20260407193651\full-migrate.sql'
schema_path = r'C:\Users\Lenovo\WorkBuddy\20260407193651\migrate-step1-schema.sql'
data_dir = r'C:\Users\Lenovo\WorkBuddy\20260407193651'

with open(sql_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 分离建表和数据
# 建表部分：从 -- CreateTable 到最后一个 -- CreateIndex / -- AddForeignKey
# 数据部分：所有 INSERT 语句

# 找到第一个 INSERT 的位置
insert_pos = content.find('\nINSERT INTO "')
if insert_pos == -1:
    insert_pos = content.find('INSERT INTO "')

# 建表部分
schema_sql = content[:insert_pos].strip()
with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema_sql)
print(f'✅ 建表 SQL: {schema_path} ({len(schema_sql)} 字符)')

# 数据部分 - 按表拆分为单独的 SQL 文件
data_sql = content[insert_pos:].strip()

# 用正则提取每个表的 INSERT
table_pattern = re.compile(r'-- (\w+): (\d+) 行\n(INSERT INTO "\w+".*?(?=\n-- |\Z))', re.DOTALL)

matches = list(table_pattern.finditer(data_sql))
if not matches:
    # 没有表头注释，按 INSERT INTO 分割
    table_blocks = {}
    for match in re.finditer(r'(INSERT INTO "(\w+)".*?;)\n?', data_sql, re.DOTALL):
        full = match.group(1)
        tbl = match.group(2)
        if tbl not in table_blocks:
            table_blocks[tbl] = []
        table_blocks[tbl].append(full)
    
    for tbl, inserts in table_blocks.items():
        data_path = f'{data_dir}\\migrate-step2-data-{tbl}.sql'
        with open(data_path, 'w', encoding='utf-8') as f:
            f.write(f'-- {tbl}: {len(inserts)} 行\n')
            f.write('\n'.join(inserts))
        print(f'   ✅ {tbl}: {len(inserts)} 条 → migrate-step2-data-{tbl}.sql')
else:
    for match in matches:
        tbl = match.group(1)
        count = match.group(2)
        sql = match.group(3).strip()
        data_path = f'{data_dir}\\migrate-step2-data-{tbl}.sql'
        with open(data_path, 'w', encoding='utf-8') as f:
            f.write(f'-- {tbl}: {count} 行\n')
            f.write(f'{sql}\n')
        print(f'   ✅ {tbl}: {count} 条 → migrate-step2-data-{tbl}.sql')

print(f'\n✅ 拆分完成！')
print(f'   ⏩ 第1步：运行 migrate-step1-schema.sql（建表）')
print(f'   ⏩ 第2步：运行 所有 migrate-step2-data-*.sql 文件（导数据）')
