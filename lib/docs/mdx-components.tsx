import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Resource } from "@/components/docs/resource";
import { ErrorTable, LimitTable, ScopeTable } from "@/components/docs/tables";

/**
 * The reference is generated, the prose is written.
 *
 * Endpoints, scopes, error codes and allowances come from
 * `lib/docs/api-reference.ts`, which a unit test holds against the routes
 * themselves. Only the explaining is MDX, so no page can describe an endpoint
 * that does not exist.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Resource,
    ScopeTable,
    LimitTable,
    ErrorTable,
    ...components,
  };
}
