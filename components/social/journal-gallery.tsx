import Image from "next/image";
import { EyeOff } from "lucide-react";
import type { JournalImage } from "@/lib/journal-images";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The images attached to a journal entry, in the order their author chose.
 *
 * Signed storage URLs cannot go through the Next image optimizer, so these are
 * served as-is; the upload pipeline already caps them at 2048px WebP. A spoiler
 * entry keeps its gallery behind the same disclosure as its note.
 */
export function JournalGallery({
  images,
  lang,
  spoilers = false,
  className = "",
}: {
  images: JournalImage[];
  lang: UiLang;
  spoilers?: boolean;
  className?: string;
}) {
  if (!images.length) return null;
  const gallery = (
    <ol
      className={`journal-gallery ${className}`.trim()}
      data-count={images.length}
    >
      {images.map((image) => (
        <li key={image.id}>
          <Image
            src={image.url}
            alt={image.caption ?? ""}
            width={image.width}
            height={image.height}
            sizes="(max-width: 760px) 100vw, 620px"
            unoptimized
          />
        </li>
      ))}
    </ol>
  );
  if (!spoilers) return gallery;
  return (
    <details className="spoiler-content journal-gallery-spoiler">
      <summary>
        <EyeOff size={14} />
        {tri(
          lang,
          "Mostrar imagens com spoilers",
          "Show spoiler images",
          "Mostrar imágenes con spoilers",
        )}
      </summary>
      {gallery}
    </details>
  );
}
