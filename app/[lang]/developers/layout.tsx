import Link from "next/link";
import type { ReactNode } from "react";
import { RESOURCES } from "@/lib/docs/api-reference";
import "./developers.css";

export default async function DevelopersLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = `/${lang}/developers`;

  return (
    <main className="docs-shell">
      <nav className="docs-nav" aria-label="API documentation">
        <strong>Getting started</strong>
        <Link href={base}>Overview</Link>
        <Link href={`${base}/authentication`}>Authentication</Link>
        <Link href={`${base}/scopes`}>Scopes</Link>
        <Link href={`${base}/limits`}>Rate limits</Link>
        <Link href={`${base}/errors`}>Errors</Link>
        <strong>Resources</strong>
        {RESOURCES.map((resource) => (
          <Link key={resource.slug} href={`${base}/${resource.slug}`}>
            {resource.title}
          </Link>
        ))}
      </nav>
      <div className="docs-body">{children}</div>
    </main>
  );
}
