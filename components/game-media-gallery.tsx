"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useState } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function GameMediaGallery({
  items,
  lang,
}: {
  items: { id: string; url: string; kind: "screenshot" | "artwork" }[];
  lang: UiLang;
}) {
  const [active, setActive] = useState<number | null>(null);
  const t = uiText(lang);
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
      <Dialog.Root
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="media-lightbox-backdrop" />
          <Dialog.Content
            className="media-lightbox"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">
              {tri(
                lang,
                "Galeria do jogo",
                "Game gallery",
                "Galería del juego",
              )}
            </Dialog.Title>
            <Dialog.Close aria-label={t.close}>
              <X size={20} />
            </Dialog.Close>
            {active !== null && (
              <Image
                src={items[active].url}
                alt=""
                fill
                sizes="100vw"
                priority
              />
            )}
            {items.length > 1 && active !== null && (
              <>
                <button
                  className="media-lightbox-prev"
                  type="button"
                  aria-label={tri(
                    lang,
                    "Imagem anterior",
                    "Previous image",
                    "Imagen anterior",
                  )}
                  onClick={() =>
                    setActive((active - 1 + items.length) % items.length)
                  }
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  className="media-lightbox-next"
                  type="button"
                  aria-label={tri(
                    lang,
                    "Próxima imagem",
                    "Next image",
                    "Imagen siguiente",
                  )}
                  onClick={() => setActive((active + 1) % items.length)}
                >
                  <ChevronRight size={24} />
                </button>
                <div
                  className="media-lightbox-pages"
                  aria-label={tri(
                    lang,
                    "Escolher imagem",
                    "Choose image",
                    "Elegir imagen",
                  )}
                >
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`${tri(lang, "Ver imagem", "View image", "Ver imagen")} ${index + 1}`}
                      aria-current={active === index ? "true" : undefined}
                      onClick={() => setActive(index)}
                    >
                      <Image src={item.url} alt="" fill sizes="64px" />
                      <span>{index + 1}</span>
                    </button>
                  ))}
                </div>
                <span className="media-lightbox-counter">
                  {active + 1} / {items.length}
                </span>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
