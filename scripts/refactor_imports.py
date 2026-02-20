import os
import re

ALIAS_MAP = {
  "utils": "#utils",
  "web": "#web",
  "hooks": "#hooks",
  "services": "#services",
  "lib": "#lib",
  "data": "#data",
  "api": "#api",
  "web/pages": "@pages",
  "web/components": "@components"
}

ROOT_DIRS = ['./src', './web', './api', './services', './hooks', './utils', './lib']
EXTENSIONS = ('.js', '.jsx')

def calculate_alias_import(file_path, original_import):
  if not original_import.startswith('.'):
    return None

  current_dir = os.path.dirname(file_path)
  resolved_target = os.path.normpath(os.path.join(current_dir, original_import))
  target_path = resolved_target.replace(os.sep, '/')
  
  if target_path.startswith('./'): target_path = target_path[2:]

  sorted_aliases = sorted(ALIAS_MAP.items(), key=lambda x: len(x[0]), reverse=True)

  for folder_path, alias in sorted_aliases:
    if target_path.startswith(folder_path):
      new_path = target_path.replace(folder_path, alias, 1)
      return new_path.replace('//', '/')

  return None

def process_file(file_path):
  try:
    with open(file_path, 'r', encoding='utf-8') as f:
      content = f.read()
    
    def replacement(match):
      quote = match.group(1)
      path = match.group(2)
      end_quote = match.group(3)
      new_path = calculate_alias_import(file_path, path)
      if new_path:
        return f"{quote}{new_path}{end_quote}"
      return match.group(0)

    new_content = re.sub(r'([\'"])(\.\.?\/[^\'"\n]+)([\'"])', replacement, content)
    
    if new_content != content:
      with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
      print(f"Fixed: {file_path}")
  except Exception as e:
    print(f"Error {file_path}: {e}")

for start_dir in ROOT_DIRS:
  if os.path.exists(start_dir):
    for root, dirs, files in os.walk(start_dir):
      for file in files:
        if file.endswith(EXTENSIONS):
          process_file(os.path.join(root, file))