import os
import re

MOVES = {
	# Game
	"src/components/GameCard": "src/components/Game/GameCard",
	"src/components/PlatformBadge": "src/components/Game/PlatformBadge",
	"src/components/PlatformIcons": "src/components/Game/PlatformIcons",
	"src/components/RatingBadge": "src/components/Game/RatingBadge",

	# Layout
	"src/components/PageBanner": "src/components/Layout/PageBanner",

	# User
	"src/components/UserBadges": "src/components/User/UserBadges",
	"src/components/UserDisplay": "src/components/User/UserDisplay",
	"src/components/SettingsModal": "src/components/User/SettingsModal",
	"src/components/BannerEditor": "src/components/User/BannerEditor",

	# UI
	"src/components/DragScrollRow": "src/components/UI/DragScrollRow",
	"src/components/ImageCropModal": "src/components/UI/ImageCropModal",
	"src/components/Lightbox": "src/components/UI/Lightbox",
	"src/components/Notification": "src/components/UI/Notification",
	"src/components/PacmanLoading": "src/components/UI/PacmanLoading",
}

ROOT_DIR = './src'
EXTENSIONS = ('.js', '.jsx', '.ts', '.tsx')

def clean_path(p):
		return os.path.normpath(p).replace(os.sep, '/').lstrip('./')

NORMALIZED_MOVES = {clean_path(k): clean_path(v) for k, v in MOVES.items()}

def calculate_new_import(file_path, original_import):
		if not original_import.startswith('.'):
				return None

		current_dir = os.path.dirname(file_path)
		resolved_target = os.path.normpath(os.path.join(current_dir, original_import))
		
		target_key = resolved_target.replace(os.sep, '/')
		
		target_key_no_ext = os.path.splitext(target_key)[0]

		if target_key_no_ext.startswith('./'):
				target_key_no_ext = target_key_no_ext[2:]

		if target_key_no_ext in NORMALIZED_MOVES:
				new_target_location = NORMALIZED_MOVES[target_key_no_ext]
				
				new_rel_path = os.path.relpath(new_target_location, current_dir)
				
				new_rel_path = new_rel_path.replace(os.sep, '/')
				
				if not new_rel_path.startswith('.'):
						new_rel_path = './' + new_rel_path
						
				return new_rel_path

		return None

def process_file(file_path):
		try:
				with open(file_path, 'r', encoding='utf-8') as f:
						content = f.read()
				
				def replacement(match):
						quote = match.group(1)
						path = match.group(2)
						end_quote = match.group(3)
						
						new_path = calculate_new_import(file_path, path)
						
						if new_path and new_path != path:
								return f"{quote}{new_path}{end_quote}"
						return match.group(0)

				new_content = re.sub(r'([\'"])([\.\/][^\'"\n]+)([\'"])', replacement, content)
				
				if new_content != content:
						with open(file_path, 'w', encoding='utf-8') as f:
								f.write(new_content)
						print(f"Corrigido: {file_path}")

		except Exception as e:
				print(f"Erro em {file_path}: {e}")

for root, dirs, files in os.walk(ROOT_DIR):
		for file in files:
				if file.endswith(EXTENSIONS):
						process_file(os.path.join(root, file))