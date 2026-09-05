import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "uloggd API",
  description:
    "Read and write a uloggd account from your own code, with a key that can never do more than its owner.",
};

export default async function DevelopersOverview({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = `/${lang}/developers`;

  return (
    <article className="docs-page">
      <h1>uloggd API</h1>
      <p className="docs-lead">
        Read and write a uloggd account from your own code. A key resolves to
        the account that made it and every request runs as that account, so a
        key can never do something its owner could not.
      </p>

      <h2>Make a key</h2>
      <p>
        Open <Link href={`/${lang}/settings?tab=developer`}>Settings</Link>,
        then Developer. Name the key, tick the permissions it needs and create
        it. The token is shown once and stored only as a hash, so if you lose it
        you make another.
      </p>

      <h2>Your first request</h2>
      <pre>
        <code>{`curl https://uloggd.com/api/v1/me \\
  -H "Authorization: Bearer ulg_live_…"`}</code>
      </pre>
      <p>
        <code>/api/v1/me</code> needs no scope, so it answers for any live key
        and tells you what that key holds.
      </p>

      <h2>How to read the rest</h2>
      <ul>
        <li>
          <Link href={`${base}/authentication`}>Authentication</Link> — the
          header, the token format, and what a refusal means.
        </li>
        <li>
          <Link href={`${base}/scopes`}>Scopes</Link> — what each permission
          covers, and what is deliberately missing.
        </li>
        <li>
          <Link href={`${base}/limits`}>Rate limits</Link> — the ceilings and
          the headers on every response.
        </li>
        <li>
          <Link href={`${base}/errors`}>Errors</Link> — one shape, always.
        </li>
      </ul>

      <h2>What stays true</h2>
      <p>
        Additive changes ship into v1. Anything that removes a field or changes
        what it means waits for v2, and the two run side by side while v1 is
        deprecated.
      </p>
    </article>
  );
}
