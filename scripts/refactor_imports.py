import os
import re

# Old_Path: New_Path or Same:Same to fix import level.
MOVES = {
		# Hooks
		"hooks/useAuth": "hooks/useAuth",

		# Libs
		"lib/supabase": "lib/supabase",

    # Game
    "src/components/GameCard": "src/components/Game/GameCard",
    "src/components/PlatformBadge": "src/components/Game/PlatformBadge",
    "src/components/PlatformIcons": "src/components/Game/PlatformIcons",
    "src/components/RatingBadge": "src/components/Game/RatingBadge",

    # Layout
    "src/components/Header": "src/components/Layout/Header",
    "src/components/Footer": "src/components/Layout/Footer",
    "src/components/PageBanner": "src/components/Layout/PageBanner",
    "src/components/RouteLoader": "src/components/Layout/RouteLoader",
    "src/components/ScrollToTop": "src/components/Layout/ScrollToTop",

    # User
    "src/components/UserDisplay": "src/components/User/UserDisplay",
    "src/components/UserBadges": "src/components/User/UserBadges",
    "src/components/BannerEditor": "src/components/User/BannerEditor",
    "src/components/SettingsModal": "src/components/User/SettingsModal",

    # UI
    "src/components/Notification": "src/components/UI/Notification",
    "src/components/Lightbox": "src/components/UI/Lightbox",
    "src/components/PacmanLoading": "src/components/UI/PacmanLoading",
    "src/components/DragScrollRow": "src/components/UI/DragScrollRow",
    "src/components/ImageCropModal": "src/components/UI/ImageCropModal",

    # Home
    "src/components/UsersChoiceCarousel": "src/components/Home/UsersChoiceCarousel",

    # Markdown Editor
    "src/components/MarkdownEditor": "src/components/MarkdownEditor"
}

ROOT_DIR = './src'
EXTENSIONS = ('.js', '.jsx', '.ts', '.tsx')

def clean_path(p):
    norm = os.path.normpath(p).replace(os.sep, '/')
    root, ext = os.path.splitext(norm)
    return root

NORMALIZED_MOVES = {clean_path(k): clean_path(v) for k, v in MOVES.items()}
REVERSE_MOVES = {v: k for k, v in NORMALIZED_MOVES.items()}

def calculate_new_import(file_path, original_import):
    if not original_import.startswith('.'):
        return None

    current_dir = os.path.dirname(file_path)
    
    resolved_target = os.path.normpath(os.path.join(current_dir, original_import))
    target_key = resolved_target.replace(os.sep, '/')
    target_key_no_ext = os.path.splitext(target_key)[0]
    if target_key_no_ext.startswith('./'): target_key_no_ext = target_key_no_ext[2:]

    if target_key_no_ext in NORMALIZED_MOVES:
        final_target = NORMALIZED_MOVES[target_key_no_ext]
        return make_rel_path(final_target, current_dir)

    current_file_key = clean_path(file_path)
    if current_file_key.startswith('./'): current_file_key = current_file_key[2:]

    if current_file_key in REVERSE_MOVES:
        original_location = REVERSE_MOVES[current_file_key]
        original_dir = os.path.dirname(original_location)

        resolved_from_origin = os.path.normpath(os.path.join(original_dir, original_import))
        origin_key = resolved_from_origin.replace(os.sep, '/')
        origin_key_no_ext = os.path.splitext(origin_key)[0]
        if origin_key_no_ext.startswith('./'): origin_key_no_ext = origin_key_no_ext[2:]

        if origin_key_no_ext in NORMALIZED_MOVES:
            final_target = NORMALIZED_MOVES[origin_key_no_ext]
            return make_rel_path(final_target, current_dir)

    return None

def make_rel_path(target, base):
    new_rel = os.path.relpath(target, base)
    new_rel = new_rel.replace(os.sep, '/')
    if not new_rel.startswith('.'):
        new_rel = './' + new_rel
    return new_rel

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