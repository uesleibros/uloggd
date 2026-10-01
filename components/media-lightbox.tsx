"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useId, useState } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export type LightboxItem = {
  id: string;
  url: string;
  alt?: string;
  label?: string;
};

/** Shared cinematic viewer for game media and community screenshots. */
export function MediaLightbox({
  items,
  active,
  onActiveChange,
  lang,
  title,
  subtitle,
  unoptimized = false,
}: {
  items: LightboxItem[];
  active: number | null;
  onActiveChange: (active: number | null) => void;
  lang: UiLang;
  title: string;
  subtitle?: string;
  unoptimized?: boolean;
}) {
  const t = uiText(lang);
  const subtitleId = useId();
  const current = active === null ? null : items[active];
  const [zoomed, setZoomed] = useState(false);
  const move = (direction: number) => {
    if (active === null || items.length < 2) return;
    setZoomed(false);
    onActiveChange((active + direction + items.length) % items.length);
  };

  return (
    <Dialog.Root
      open={Boolean(current)}
      onOpenChange={(open) => {
        if (!open) {
          setZoomed(false);
          onActiveChange(null);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="media-lightbox-backdrop" />
        <Dialog.Content
          className="media-lightbox"
          aria-describedby={subtitle ? subtitleId : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") move(-1);
            if (event.key === "ArrowRight") move(1);
          }}
        >
          <header className="media-lightbox-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {subtitle && (
                <Dialog.Description id={subtitleId}>
                  {subtitle}
                </Dialog.Description>
              )}
            </div>
            <div className="media-lightbox-actions">
              {current && (
                <>
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={tri(
                      lang,
                      "Abrir imagem original",
                      "Open original image",
                      "Abrir imagen original",
                    )}
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setZoomed((value) => !value)}
                    aria-label={
                      zoomed
                        ? tri(
                            lang,
                            "Reduzir imagem",
                            "Zoom out",
                            "Alejar imagen",
                          )
                        : tri(
                            lang,
                            "Ampliar imagem",
                            "Zoom in",
                            "Ampliar imagen",
                          )
                    }
                    aria-pressed={zoomed}
                  >
                    {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                  </button>
                </>
              )}
              <Dialog.Close
                aria-label={t.close}
                onClick={() => setZoomed(false)}
              >
                <X size={20} />
              </Dialog.Close>
            </div>
          </header>
          <div
            className="media-lightbox-stage"
            data-context-kind="image"
            data-context-title={current?.alt || title}
            data-context-href={current?.url}
            tabIndex={-1}
            data-zoomed={zoomed || undefined}
          >
            {current && (
              <Image
                src={current.url}
                alt={current.alt ?? title}
                fill
                sizes="100vw"
                priority
                unoptimized={unoptimized}
                onClick={() => setZoomed((value) => !value)}
              />
            )}
          </div>
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
                onClick={() => move(-1)}
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
                onClick={() => move(1)}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <footer className="media-lightbox-footer">
            <div className="media-lightbox-caption">
              <strong>{current?.label ?? current?.alt ?? title}</strong>
              {items.length > 1 && active !== null && (
                <span>
                  {active + 1} / {items.length}
                </span>
              )}
            </div>
            {items.length > 1 && (
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
                    onClick={() => {
                      setZoomed(false);
                      onActiveChange(index);
                    }}
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
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
