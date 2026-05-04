"""替换 $executeRawUnsafe 中的 ? 占位符为 $1, $2 等 (PostgreSQL 兼容)"""
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
                lines = fh.readlines()
            
            new_lines = []
            changed = False
            in_execute_raw = False
            placeholder_count = 0
            
            for line in lines:
                # Detect start of $executeRawUnsafe
                if '$executeRawUnsafe(' in line:
                    in_execute_raw = True
                    placeholder_count = 0
                
                if in_execute_raw:
                    # Find SQL string content between quotes
                    # Replace ? inside SQL strings with $1, $2, etc.
                    # We need to be careful to only replace ? inside string literals
                    
                    # Simple approach: replace ? in the SQL string
                    # A more robust approach would parse the string properly
                    new_line = line
                    pos = 0
                    result_parts = []
                    
                    # Find SQL string literals (single-quoted or backtick-quoted)
                    # Replace ? inside those strings only
                    in_sql_string = False
                    sql_string_char = None
                    i = 0
                    placeholder_idx = 1
                    output = []
                    
                    while i < len(line):
                        ch = line[i]
                        
                        if not in_sql_string:
                            if ch in ('"', "'", '`'):
                                # Check if it's a backtick or single-quoted SQL string
                                # We look for the SQL string in $executeRawUnsafe
                                in_sql_string = True
                                sql_string_char = ch
                                output.append(ch)
                            else:
                                output.append(ch)
                        else:
                            if ch == sql_string_char:
                                # Check if escaped
                                if i > 0 and line[i-1] == '\\':
                                    output.append(ch)
                                else:
                                    in_sql_string = False
                                    sql_string_char = None
                                    output.append(ch)
                            elif ch == '?' and sql_string_char in ("'", '`'):
                                # Replace ? with $N
                                output.append(f'${placeholder_idx}')
                                placeholder_idx += 1
                                changed = True
                            else:
                                output.append(ch)
                        
                        i += 1
                    
                    new_line = ''.join(output)
                    
                    # Check if this line ends the statement
                    if ')' in line and line.count('(') <= line.count(')'):
                        in_execute_raw = False
                    
                    new_lines.append(new_line)
                else:
                    new_lines.append(line)
            
            if changed:
                total_count += 1
                with open(path, 'w', encoding='utf-8') as fh:
                    fh.writelines(new_lines)
                print(f'  ✓ {os.path.relpath(path, src_dir)}')

print(f'\n修改完成，共处理 {total_count} 个文件')
