import { RESOURCES } from "@/lib/docs/api-reference";
import type { UiLang } from "@/lib/ui-text";
import { EndpointCard } from "./endpoint";

/**
 * Every endpoint of one resource, from the reference rather than from prose.
 *
 * A page that listed its endpoints by hand would drift from the routes, and
 * the drift would look like documentation. This reads the same file the
 * contract test reads, so an endpoint can only appear here by existing.
 */
export function Resource({ slug, lang }: { slug: string; lang: UiLang }) {
  const resource = RESOURCES.find((one) => one.slug === slug);
  if (!resource)
    throw new Error(`the documentation asks for a resource named ${slug}`);

  return (
    <div className="docs-endpoints">
      {resource.endpoints.map((endpoint) => (
        <EndpointCard
          key={endpoint.method + endpoint.path}
          endpoint={endpoint}
          lang={lang}
        />
      ))}
    </div>
  );
}
