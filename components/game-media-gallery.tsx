"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useState } from "react";
import { uiText } from "@/lib/ui-text";

export function GameMediaGallery({
  items,
  lang,
}: {
  items: { id: string; url: string; kind: "screenshot" | "artwork" }[];
  lang: "pt-BR" | "en";
}) {
  const [active, setActive] = useState<number | null>(null);
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  if (!items.length) return null;
  const visible = items.slice(0, 7);

  return (
    <section className="game-section game-gallery-section">
      <header className="game-section-heading">
        <div>
          <span>{pt ? "IMAGENS" : "IMAGES"}</span>
          <h2>{pt ? "Galeria" : "Gallery"}</h2>
        </div>
        <small>{items.length}</small>
      </header>
      <div className="game-gallery-grid">
        {visible.map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setActive(index)}
            aria-label={`${pt ? "Abrir imagem" : "Open image"} ${index + 1}`}
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
              {pt ? "Galeria do jogo" : "Game gallery"}
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
                  aria-label={pt ? "Imagem anterior" : "Previous image"}
                  onClick={() =>
                    setActive((active - 1 + items.length) % items.length)
                  }
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  className="media-lightbox-next"
                  type="button"
                  aria-label={pt ? "Próxima imagem" : "Next image"}
                  onClick={() => setActive((active + 1) % items.length)}
                >
                  <ChevronRight size={24} />
                </button>
                <div
                  className="media-lightbox-pages"
                  aria-label={pt ? "Escolher imagem" : "Choose image"}
                >
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`${pt ? "Ver imagem" : "View image"} ${index + 1}`}
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
