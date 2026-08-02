import { EyeOff } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";
import type { ReactNode } from "react";

/**
 * Hides a picture until the viewer asks for it.
 *
 * The same disclosure a spoiler gallery uses, deliberately: someone who has
 * learned that a closed panel means "you decide whether to look" should not
 * have to learn a second control for a stronger version of the same idea.
 *
 * Separate from the spoiler cover rather than sharing its flag, because the
 * two answer different questions. A spoiler warning is a courtesy about a
 * story; this is about who should be seeing the image. Sharing one control
 * would mean opening a plot detail also opts someone into everything else.
 *
 * Both can apply to one screenshot, and the sensitive cover is the outer one:
 * whoever opens it has made the decision that matters, and being asked twice
 * about the same picture reads as a bug.
 */
export function SensitiveCover({
  sensitive,
  lang,
  children,
}: {
  sensitive: boolean;
  lang: UiLang;
  children: ReactNode;
}) {
  if (!sensitive) return children;
  return (
    <details className="spoiler-content sensitive-cover">
      <summary>
        <EyeOff size={14} />
        {tri(
          lang,
          "Conteúdo sensível. Toque para mostrar",
          "Sensitive content. Tap to show",
          "Contenido sensible. Toca para mostrar",
        )}
      </summary>
      {children}
    </details>
  );
}
