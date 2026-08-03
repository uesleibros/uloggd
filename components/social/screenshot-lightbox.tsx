"use client";

import Image from "next/image";
import { EyeOff, Expand } from "lucide-react";
import { useState } from "react";
import { MediaLightbox } from "@/components/media-lightbox";
import { tri, type UiLang } from "@/lib/ui-text";

export function ScreenshotLightbox({
  id,
  url,
  width,
  height,
  spoilers,
  alt,
  lang,
}: {
  id: string;
  url: string;
  width: number;
  height: number;
  spoilers: boolean;
  alt: string;
  lang: UiLang;
}) {
  const [active, setActive] = useState<number | null>(null);
  const openLabel = tri(
    lang,
    "Abrir captura em tela cheia",
    "Open screenshot full screen",
    "Abrir captura a pantalla completa",
  );

  return (
    <>
      <button
        type="button"
        className="activity-screenshot"
        onClick={() => setActive(0)}
        aria-label={openLabel}
      >
        <Image
          src={url}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 620px) calc(100vw - 112px), 480px"
          unoptimized
        />
        <span className="activity-screenshot-expand" aria-hidden>
          <Expand size={15} />
        </span>
        {spoilers && (
          <span className="activity-screenshot-spoiler">
            <EyeOff size={18} />
            {tri(
              lang,
              "Revelar captura",
              "Reveal screenshot",
              "Revelar captura",
            )}
          </span>
        )}
      </button>
      <MediaLightbox
        items={[{ id, url, alt }]}
        active={active}
        onActiveChange={setActive}
        lang={lang}
        title={tri(lang, "Captura", "Screenshot", "Captura")}
        unoptimized
      />
    </>
  );
}
