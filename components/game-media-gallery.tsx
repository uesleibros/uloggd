"use client";

import Image from "next/image";
import { Images } from "lucide-react";
import { useState } from "react";
import { MediaLightbox } from "@/components/media-lightbox";
import { tri, type UiLang } from "@/lib/ui-text";

export function GameMediaGallery({
  items,
  lang,
}: {
  items: { id: string; url: string; kind: "screenshot" | "artwork" }[];
  lang: UiLang;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (!items.length) return null;
  const visible = items.slice(0, 7);

  return (
    <section className="game-section game-gallery-section">
      <header className="game-section-heading">
        <div>
          <h2>{tri(lang, "Galeria", "Gallery", "Galería")}</h2>
        </div>
        <small>{items.length}</small>
      </header>
      <div className="game-gallery-grid">
        {visible.map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setActive(index)}
            aria-label={`${tri(lang, "Abrir imagem", "Open image", "Abrir imagen")} ${index + 1}`}
          >
            <Image
              src={item.url}
              alt=""
              fill
              sizes="(max-width: 620px) 50vw, 240px"
            />
            {index === visible.length - 1 && items.length > visible.length && (
              <span>
                <Images size={17} />+{items.length - visible.length}
              </span>
            )}
          </button>
        ))}
      </div>
      <MediaLightbox
        items={items}
        active={active}
        onActiveChange={setActive}
        lang={lang}
        title={tri(
          lang,
          "Galeria do jogo",
          "Game gallery",
          "Galería del juego",
        )}
      />
    </section>
  );
}
