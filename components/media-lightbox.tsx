"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export type LightboxItem = { id: string; url: string; alt?: string };

/** Shared cinematic viewer for game media and community screenshots. */
export function MediaLightbox({
  items,
  active,
  onActiveChange,
  lang,
  title,
  unoptimized = false,
}: {
  items: LightboxItem[];
  active: number | null;
  onActiveChange: (active: number | null) => void;
  lang: UiLang;
  title: string;
  unoptimized?: boolean;
}) {
  const t = uiText(lang);
  const current = active === null ? null : items[active];

  return (
    <Dialog.Root
      open={Boolean(current)}
      onOpenChange={(open) => !open && onActiveChange(null)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="media-lightbox-backdrop" />
        <Dialog.Content className="media-lightbox" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Close aria-label={t.close}>
            <X size={20} />
          </Dialog.Close>
          {current && (
            <Image
              src={current.url}
              alt={current.alt ?? ""}
              fill
              sizes="100vw"
              priority
              unoptimized={unoptimized}
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
                  onActiveChange((active - 1 + items.length) % items.length)
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
                onClick={() => onActiveChange((active + 1) % items.length)}
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
                    onClick={() => onActiveChange(index)}
                  >
                    <Image
                      src={item.url}
                      alt=""
                      fill
                      sizes="64px"
                      unoptimized={unoptimized}
                    />
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
  );
}
