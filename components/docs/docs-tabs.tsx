"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FullSearchTrigger } from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { DOCS_GUIDE_TITLES, RESOURCES, say } from "@/lib/docs/api-reference";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The reference's navigation, in the shape the rest of the site uses.
 *
 * Settings and a profile move between their sections with a row of tabs, not
 * with a rail, and the site already owns the rail on the left. Two of those on
 * one screen was the thing that read wrong, so the documentation borrows the
 * idiom the site already had rather than bringing a second one.
 *
 * The second row only appears inside Resources, which is the same way the
 * profile shows its own sub-tabs: a level of navigation that is not being used
 * should not be taking up a line.
 */
export function DocsTabs({ lang }: { lang: UiLang }) {
  const pathname = usePathname();
  const base = `/${lang}/developers`;
  const inResources = pathname.startsWith(`${base}/resources`);

  const guides = DOCS_GUIDE_TITLES.map((guide) => ({
    href: guide.slug ? `${base}/${guide.slug}` : base,
    label: say(lang, guide.title),
  }));

  const resourcesHref = `${base}/resources/${RESOURCES[0].slug}`;

  return (
    <>
      <div className="docs-tabs-row">
        <nav
          className="game-page-nav docs-tabs"
          aria-label={tri(
            lang,
            "Seções da documentação",
            "Documentation sections",
            "Secciones de la documentación",
          )}
        >
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              aria-current={pathname === guide.href ? "page" : undefined}
            >
              {guide.label}
            </Link>
          ))}
          {/* Marked as the open section, not as the current page: it links to
              the first resource, and announcing a link to somewhere else as
              the page you are on is a lie a screen reader repeats. */}
          <Link href={resourcesHref} data-section={inResources || undefined}>
            {tri(lang, "Recursos", "Resources", "Recursos")}
          </Link>
        </nav>
        {/* Outside the row that scrolls. The rail carried the search, and
            turning the rail off took it with it; putting it back inside a
            scrolling row would have hidden it again below 1050px. */}
        <FullSearchTrigger className="docs-search" />
      </div>

      {inResources && (
        <nav
          className="game-page-nav docs-tabs docs-tabs-resources"
          aria-label={tri(lang, "Recursos", "Resources", "Recursos")}
        >
          {RESOURCES.map((resource) => {
            const href = `${base}/resources/${resource.slug}`;
            return (
              <Link
                key={resource.slug}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                {say(lang, resource.title)}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
