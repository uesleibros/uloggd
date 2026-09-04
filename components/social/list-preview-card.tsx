import Link from "next/link";
import {
  Globe2,
  Heart,
  MessageCircle,
  Layers3,
  LayoutGrid,
  ListOrdered,
  Lock,
  Users,
} from "lucide-react";
import { withEmoji } from "@/lib/emoji";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { SafeImage } from "@/components/safe-image";

/**
 * The single way a list is previewed anywhere on the platform: a fanned stack
 * of covers over the page background, with the name and meta underneath.
 * Sizing is percentage-based so the same markup works in the lists index, the
 * profile subpage and the narrow profile aside without per-page overrides.
 *
 * `ranked` decides whether the card wears the Ranking chip (with an order
 * icon) or the Collection chip (with a layers icon), so the reader knows what
 * to expect inside before opening the list.
 */
export type ListPreviewCover = {
  url: string;
  fallbackUrl?: string;
  name?: string;
};

/** How many cards the fan is drawn out of. */
export const LIST_PREVIEW_SLOTS = 5;

/**
 * The stack's contents: always five entries, covers first, blanks after.
 *
 * Fixed because the fan is built out of five children and every rule that
 * shapes it is per-position: the widths, the negative overlap, the stacking
 * order, the hover offsets. Render fewer and the card does not shrink
 * gracefully, it draws a stub against empty space, which is what an empty
 * collection looked like. The shape of the card says "a list"; the count
 * underneath says how many are in it.
 */
export function listPreviewSlots(
  covers: ListPreviewCover[],
): (ListPreviewCover | null)[] {
  return Array.from(
    { length: LIST_PREVIEW_SLOTS },
    (_, index) => covers[index] ?? null,
  );
}

export function ListPreviewCard({
  list,
  covers,
  tierRows,
  lang,
  likes = 0,
  comments = 0,
}: {
  list: {
    id: string;
    publicId?: string;
    name: string;
    description: string | null;
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
    ranked?: boolean;
    kind?: "COLLECTION" | "TIERLIST";
    count: number;
  };
  covers: { url: string; fallbackUrl?: string; name: string }[];
  /** Miniature tier rows; when present the card previews the board itself. */
  tierRows?: {
    label: string;
    color: string;
    covers: { url: string; fallbackUrl?: string }[];
  }[];
  lang: UiLang;
  likes?: number;
  comments?: number;
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
  const ranked = Boolean(list.ranked);
  const tierlist = list.kind === "TIERLIST";
  const mode = tierlist ? "tierlist" : ranked ? "ranked" : "collection";
  const slots = listPreviewSlots(covers);
  return (
    <Link
      className="list-preview"
      href={`/${lang}/lists/${list.publicId ?? list.id}`}
      data-mode={mode}
    >
      {tierlist ? (
        <span className="list-preview-tiers" aria-hidden>
          {tierRows && tierRows.length ? (
            tierRows.map((row, rowIndex) => (
              <span className="list-preview-tier" key={rowIndex}>
                <span
                  className="list-preview-tier-swatch"
                  style={{ background: row.color }}
                />
                <span className="list-preview-tier-covers">
                  {row.covers.map((cover, index) => (
                    <span key={`${cover.url}-${index}`}>
                      <SafeImage
                        src={cover.url}
                        fallbackSrc={cover.fallbackUrl}
                        alt=""
                        fill
                        sizes="40px"
                      />
                    </span>
                  ))}
                </span>
              </span>
            ))
          ) : (
            <span className="list-preview-blank">
              <LayoutGrid size={22} />
            </span>
          )}
        </span>
      ) : (
        <span className="list-preview-stack" aria-hidden>
          {slots.map((cover, index) =>
            cover ? (
              <span key={`${cover.url}-${index}`}>
                <SafeImage
                  src={cover.url}
                  fallbackSrc={cover.fallbackUrl}
                  alt=""
                  fill
                  sizes="120px"
                />
              </span>
            ) : (
              <span className="list-preview-blank" key={`blank-${index}`} />
            ),
          )}
        </span>
      )}
      <span className="list-preview-mode" data-mode={mode}>
        {tierlist ? (
          <LayoutGrid size={11} />
        ) : ranked ? (
          <ListOrdered size={11} />
        ) : (
          <Layers3 size={11} />
        )}
        {tierlist
          ? "Tierlist"
          : ranked
            ? tri(lang, "Ranking", "Ranking", "Ranking")
            : tri(lang, "Coleção", "Collection", "Colección")}
      </span>
      <span className="list-preview-name">{withEmoji(list.name)}</span>
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
        {/* Beside the likes and shown the same way, at zero as well. Lists are
            the most replied-to thing here — four of the site's six comments —
            and this card was the one surface that never mentioned it. Text
            rather than a link, because the whole card is already one and it
            goes to the page the conversation is on. */}
        <span
          className="list-preview-likes"
          data-empty={!comments || undefined}
        >
          <MessageCircle size={11} />
          {comments.toLocaleString(lang)}
        </span>
      </span>
      {list.description && (
        <span className="list-preview-note">{withEmoji(list.description)}</span>
      )}
    </Link>
  );
}
