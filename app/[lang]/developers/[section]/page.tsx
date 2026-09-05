import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EndpointCard } from "@/components/docs/endpoint";
import { BUCKETS, ERROR_CODES, RESOURCES } from "@/lib/docs/api-reference";

import { DOCS_GUIDES } from "@/lib/docs/api-reference";

export async function generateStaticParams() {
  return [...DOCS_GUIDES, ...RESOURCES.map((one) => one.slug)].map(
    (section) => ({
      section,
    }),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const resource = RESOURCES.find((one) => one.slug === section);
  const title = resource
    ? resource.title
    : section.charAt(0).toUpperCase() + section.slice(1);
  return { title: `${title} · uloggd API` };
}

function Authentication() {
  return (
    <article className="docs-page">
      <h1>Authentication</h1>
      <p className="docs-lead">
        Every request carries its key in one header. There is no other way in,
        and no request is answered without one.
      </p>
      <pre>
        <code>Authorization: Bearer ulg_live_…</code>
      </pre>

      <h2>The token</h2>
      <p>
        A token is <code>ulg_live_</code> followed by 32 hexadecimal characters.
        The prefix makes it recognisable in a log or a paste, which is what
        makes leak scanning possible at all. Only a hash of it is stored, so
        nobody, including us, can read a key back after it is made.
      </p>

      <h2>What a refusal means</h2>
      <p>
        A key that is unknown, revoked, expired or malformed all answer the
        same: <code>401 invalid_key</code>. They are deliberately not told
        apart, so a token cannot be probed for which kind of wrong it is.
      </p>
      <p>
        A key that is live but lacks the permission answers{" "}
        <code>403 insufficient_scope</code>, and the body names the scope it was
        missing.
      </p>

      <h2>What a key can reach</h2>
      <p>
        The request runs as the account that owns the key, and the database
        decides the rest with the same rules it applies to the website. A key
        with <code>lists.write</code> on an account that cannot write to a
        private list still cannot write to it. A scope is a ceiling, never a
        grant.
      </p>
    </article>
  );
}

function Scopes() {
  const rows = RESOURCES.flatMap((resource) =>
    resource.endpoints
      .map((endpoint) => endpoint.scope)
      .filter((scope): scope is string => Boolean(scope))
      .map((scope) => ({ scope, resource: resource.title })),
  );
  const unique = [...new Map(rows.map((row) => [row.scope, row])).values()];

  return (
    <article className="docs-page">
      <h1>Scopes</h1>
      <p className="docs-lead">
        A key carries a set of scopes, and a request outside that set is refused
        before it reaches the database. Ask for the fewest that do the job: a
        key is easier to hand out when it can do less.
      </p>

      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Scope</th>
              <th>Covers</th>
            </tr>
          </thead>
          <tbody>
            {unique.map((row) => (
              <tr key={row.scope}>
                <td>
                  <code>{row.scope}</code>
                </td>
                <td>{row.resource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Deliberately absent</h2>
      <p>Worth saying out loud rather than discovering later:</p>
      <ul>
        <li>
          <strong>No comment scope.</strong> Comments are the surface abuse
          arrives through, and a posting API is an abuse API. It waits until
          there is a reason for it.
        </li>
        <li>
          <strong>No moderation scope.</strong> Moderator powers are not
          delegable to a key.
        </li>
        <li>
          <strong>No account deletion.</strong> That goes through a second
          factor and a typed confirmation, and a key is neither.
        </li>
        <li>
          <strong>Nothing reaches another account&rsquo;s private data.</strong>{" "}
          <code>social.read</code> returns who the owner follows, not what those
          people hold.
        </li>
      </ul>
    </article>
  );
}

function Limits() {
  return (
    <article className="docs-page">
      <h1>Rate limits</h1>
      <p className="docs-lead">
        Allowances are counted per key, not per account, so a noisy integration
        cannot spend the allowance its owner needs to use the site.
      </p>

      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Allowance</th>
              <th>Per hour</th>
              <th>Covers</th>
            </tr>
          </thead>
          <tbody>
            {BUCKETS.map((bucket) => (
              <tr key={bucket.name}>
                <td>
                  <code>{bucket.name}</code>
                </td>
                <td>{bucket.ceiling}</td>
                <td>{bucket.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Headers</h2>
      <p>
        Every response carries the numbers, including the ones that are allowed,
        so a client can slow down before it hits the wall rather than after.
      </p>
      <pre>
        <code>{`X-RateLimit-Limit: 600
X-RateLimit-Remaining: 597
X-RateLimit-Reset: 1788568502`}</code>
      </pre>
      <p>
        <code>Reset</code> is a Unix timestamp anchored to the oldest call in
        the window, so it does not move away as you keep trying. Over the
        ceiling, the answer is <code>429 rate_limited</code> with{" "}
        <code>retry_after</code> in seconds.
      </p>
    </article>
  );
}

function Errors() {
  return (
    <article className="docs-page">
      <h1>Errors</h1>
      <p className="docs-lead">
        One shape, always, including on 500. <code>code</code> is stable and
        meant to be matched on; <code>message</code> is for a human reading a
        log and is not a contract.
      </p>
      <pre>
        <code>{`{
  "error": {
    "code": "insufficient_scope",
    "message": "This key does not hold library.write.",
    "scope": "library.write"
  }
}`}</code>
      </pre>

      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Status</th>
              <th>Means</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_CODES.map((row) => (
              <tr key={row.code}>
                <td>
                  <code>{row.code}</code>
                </td>
                <td>{row.status}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default async function DocsSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (section === "authentication") return <Authentication />;
  if (section === "scopes") return <Scopes />;
  if (section === "limits") return <Limits />;
  if (section === "errors") return <Errors />;

  const resource = RESOURCES.find((one) => one.slug === section);
  if (!resource) notFound();

  return (
    <article className="docs-page">
      <h1>{resource.title}</h1>
      <p className="docs-lead">{resource.blurb}</p>
      {resource.endpoints.map((endpoint) => (
        <EndpointCard
          key={endpoint.method + endpoint.path}
          endpoint={endpoint}
        />
      ))}
    </article>
  );
}
