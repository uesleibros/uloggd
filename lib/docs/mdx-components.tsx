import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Resource } from "@/components/docs/resource";
import { ErrorTable, LimitTable, ScopeTable } from "@/components/docs/tables";
import type { UiLang } from "@/lib/ui-text";

/**
 * The reference is generated, the prose is written.
 *
 * Endpoints, scopes, error codes and allowances come from
 * `lib/docs/api-reference.ts`, which a unit test holds against the routes
 * themselves. Only the explaining is MDX, so no page can describe an endpoint
 * that does not exist.
 *
 * The language is bound here rather than passed in every page, because a page
 * that had to remember to pass it would eventually not.
 */
export function getMDXComponents(lang: UiLang): MDXComponents {
  return {
    ...defaultComponents,
    Resource: ({ slug }: { slug: string }) => (
      <Resource slug={slug} lang={lang} />
    ),
    ScopeTable: () => <ScopeTable lang={lang} />,
    LimitTable: () => <LimitTable lang={lang} />,
    ErrorTable: () => <ErrorTable lang={lang} />,
  };
}
