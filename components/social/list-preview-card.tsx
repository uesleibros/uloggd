import { getMediaUrl } from "@/lib/media-url";
import Link from "next/link";
import type { Visibility } from "@/lib/visibility";
import { StaffOverlay } from "@/components/moderation/staff-remove";
import {
  Globe2,
  Heart,
  MessageCircle,
  LayoutGrid,
  Lock,
  Users,
} from "lucide-react";
import { withEmoji } from "@/lib/emoji";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { SafeImage } from "@/components/safe-image";
import { VerifiedMark } from "@/components/verified-badge";

/**
 * The single way a list is previewed anywhere on the platform: a fanned stack
 * of covers over the page background, with the name and meta underneath.
 * Sizing is percentage-based so the same markup works in the lists index, the
 * profile subpage and the narrow profile aside without per-page overrides.
 *
 * `ranked` numbers the covers and `kind` draws a board instead of a stack, so
 * the card says what kind of list it is by looking like one rather than by
 * wearing a word.
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
  likedByViewer: mine = false,
  comments = 0,
}: {
  list: {
    id: string;
    publicId?: string;
    /** Whose list it is, so staff never sees a removal on their own. */
    ownerId?: string | null;
    /**
     * The author, shown under the name on listings that span more than one
     * account. Search answered with a wall of list names and no way to tell
     * whose any of them were.
     */
    owner?: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      verified: boolean;
    } | null;
    name: string;
    description: string | null;
    visibility: Visibility;
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
  /** Whether the reader is one of them, which is what fills the heart. */
  likedByViewer?: boolean;
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
    <StaffOverlay kind="LIST" id={list.id} lang={lang} authorId={list.ownerId}>
      <article
        className="list-preview"
        data-mode={mode}
        data-context-kind="list"
        data-context-title={list.name}
      >
        <Link
          prefetch={false}
          className="list-preview-link"
          data-context-link
          href={`/${lang}/lists/${list.publicId ?? list.id}`}
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
          {/* No chip saying what kind of list this is. "Collection" over a
            shelf of covers is a word about the software, not about the list,
            and where the kind matters the card already shows it: a ranking
            numbers its covers and a tierlist draws its rows. The card keeps
            `data-mode`, which is what those two styles hang from. */}
          <span className="list-preview-name">{withEmoji(list.name)}</span>
        </Link>
        {list.owner && (
          <Link
            prefetch={false}
            className="list-preview-owner"
            data-context-link
            href={`/${lang}/u/${list.owner.username}`}
          >
            <span className="list-preview-owner-avatar" aria-hidden>
              {list.owner.avatar_url ? (
                <SafeImage
                  src={getMediaUrl(list.owner.avatar_url)}
                  alt=""
                  fill
                  sizes="20px"
                />
              ) : (
                (list.owner.display_name || list.owner.username)
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </span>
            <b>{withEmoji(list.owner.display_name) || list.owner.username}</b>
            {list.owner.verified && <VerifiedMark size={11} />}
            <small>@{list.owner.username}</small>
          </Link>
        )}
        <span className="list-preview-facts">
          <span>
            <VisibilityIcon size={11} />
            {visibility}
          </span>
          <span>
            {list.count} {t.gamesLower}
          </span>
          {/* Always shown, even at zero: hiding it made the count look like
            it did not exist rather than like nobody had liked the list yet.
            The heart is filled only when the reader is one of them, which is
            the middle ground between the two ways this has been wrong: filled
            for anything with a like at all, so every popular list looked like
            one you had liked, and then outlined come what may, so your own
            like left no mark. */}
          <span className="list-preview-likes" data-mine={mine || undefined}>
            <Heart size={11} fill={mine ? "currentColor" : "none"} />
            {likes.toLocaleString(lang)}
          </span>
          <span className="list-preview-likes">
            <MessageCircle size={11} />
            {comments.toLocaleString(lang)}
          </span>
        </span>
        {list.description && (
          <span className="list-preview-note">
            {withEmoji(list.description)}
          </span>
        )}
      </article>
    </StaffOverlay>
  );
}
