import Link from "next/link";
import { Globe2, Heart, Lock, Users } from "lucide-react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { SafeImage } from "@/components/safe-image";

/**
 * The single way a list is previewed anywhere on the platform: a fanned stack
 * of covers over the page background, with the name and meta underneath.
 * Sizing is percentage-based so the same markup works in the lists index, the
 * profile subpage and the narrow profile aside without per-page overrides.
 */
export function ListPreviewCard({
  list,
  covers,
  lang,
  likes = 0,
}: {
  list: {
    id: string;
    publicId?: string;
    name: string;
    description: string | null;
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
    count: number;
  };
  covers: { url: string; fallbackUrl?: string; name: string }[];
  lang: UiLang;
  likes?: number;
}) {
  const t = uiText(lang);
  const visibility =
    list.visibility === "PRIVATE"
      ? tri(lang, "Privada", "Private", "Privada")
      : list.visibility === "FOLLOWERS"
        ? t.followers
        : tri(lang, "Pública", "Public", "Pública");
  const VisibilityIcon =
    list.visibility === "PRIVATE"
      ? Lock
      : list.visibility === "FOLLOWERS"
        ? Users
        : Globe2;
  const shown = covers.slice(0, 5);
  return (
    <Link
      className="list-preview"
      href={`/${lang}/lists/${list.publicId ?? list.id}`}
    >
      <span className="list-preview-stack" aria-hidden>
        {shown.length ? (
          shown.map((cover, index) => (
            <span key={`${cover.url}-${index}`}>
              <SafeImage
                src={cover.url}
                fallbackSrc={cover.fallbackUrl}
                alt=""
                fill
                sizes="120px"
              />
            </span>
          ))
        ) : (
          <span className="list-preview-blank" />
        )}
      </span>
      <span className="list-preview-name">{list.name}</span>
      <span className="list-preview-facts">
        <span>
          <VisibilityIcon size={11} />
          {visibility}
        </span>
        <span>
          {list.count} {t.gamesLower}
        </span>
        {/* Always shown, even at zero: hiding it made the count look like it
            did not exist rather than like nobody had liked the list yet. */}
        <span className="list-preview-likes" data-empty={!likes || undefined}>
          <Heart size={11} fill={likes > 0 ? "currentColor" : "none"} />
          {likes.toLocaleString(lang)}
        </span>
      </span>
      {list.description && (
        <span className="list-preview-note">{list.description}</span>
      )}
    </Link>
  );
}
