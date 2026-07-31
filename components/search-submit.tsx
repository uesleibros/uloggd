import { LoaderCircle, Search } from "lucide-react";
import { uiText, type UiLang } from "@/lib/ui-text";

/**
 * The one search button on the platform.
 *
 * Every search field, catalog, reviews, library, lists, connections,
 * moderation, used to end in a different control: some had no button at all,
 * some collapsed to a bare "→" glyph on narrow screens, which reads as
 * "advance" rather than "search". This keeps the magnifier visible at every
 * width; only the word collapses, and the pending state always spins here.
 */
export function SearchSubmit({
  lang,
  pending = false,
  disabled = false,
  className = "",
}: {
  lang: UiLang;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const t = uiText(lang);
  const label = pending ? t.searching : t.search;
  return (
    <button
      type="submit"
      className={`search-submit ${className}`.trim()}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      aria-label={label}
    >
      {pending ? (
        <LoaderCircle className="spin" size={14} aria-hidden />
      ) : (
        <Search size={14} aria-hidden />
      )}
      <span>{label}</span>
    </button>
  );
}
