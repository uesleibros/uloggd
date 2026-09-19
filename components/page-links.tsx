import Link from "next/link";
import { ShallowLink } from "@/components/shallow-link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Previous and next links for a server-rendered list.
 *
 * The `Pagination` control takes an `onGo` callback, so it only works inside a
 * client component. Server pages that page through a `?page=` query string get
 * this instead: no client bundle, and the pages stay linkable and crawlable.
 */
export function PageLinks({
  page,
  pageCount,
  hrefFor,
  lang,
  label,
  className = "",
  shallow = false,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  lang: UiLang;
  label: string;
  className?: string;
  /**
   * For a section that reads the page from the URL and fetches it itself, so
   * turning the page moves the address without rendering the page again.
   */
  shallow?: boolean;
}) {
  if (pageCount <= 1) return null;
  const Anchor = shallow ? ShallowLink : Link;
  return (
    <nav className={`page-links ${className}`.trim()} aria-label={label}>
      {page > 1 ? (
        <Anchor href={hrefFor(page - 1)} rel="prev">
          <ArrowLeft size={14} />
          {tri(lang, "Anteriores", "Previous", "Anteriores")}
        </Anchor>
      ) : (
        <span />
      )}
      <small>
        {tri(
          lang,
          `Página ${page} de ${pageCount}`,
          `Page ${page} of ${pageCount}`,
          `Página ${page} de ${pageCount}`,
        )}
      </small>
      {page < pageCount ? (
        <Anchor href={hrefFor(page + 1)} rel="next">
          {tri(lang, "Seguintes", "Next", "Siguientes")}
          <ArrowRight size={14} />
        </Anchor>
      ) : (
        <span />
      )}
    </nav>
  );
}
