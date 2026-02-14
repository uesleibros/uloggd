"""
Uloggd Platform Icon Normalizer
--------------------------------
Script responsável por padronizar os ícones de plataformas
para exibição consistente no frontend.

* Mantém proporção da imagem original
* Centraliza o ícone
* Preenche com fundo transparente
* Gera output em pasta separada (não sobrescreve originais)
"""

from PIL import Image
import os

INPUT_FOLDER = "public/platforms"
OUTPUT_FOLDER = "public/platforms_out"
SIZE = (256, 256)

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

for file in os.listdir(INPUT_FOLDER):
    if file.lower().endswith(".png"):
        path = os.path.join(INPUT_FOLDER, file)
        img = Image.open(path).convert("RGBA")

        img.thumbnail(SIZE)

        new_img = Image.new("RGBA", SIZE, (0, 0, 0, 0))
        new_img.paste(
            img,
            ((SIZE[0] - img.width) // 2, (SIZE[1] - img.height) // 2)
        )

        new_img.save(os.path.join(OUTPUT_FOLDER, file))
        print(f"✔ {file} redimensionado")
