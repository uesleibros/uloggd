import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundView } from "@/components/not-found-view";
import { hasLocale } from "../dictionaries";

/**
 * The destination the proxy rewrites unknown URLs to, so a dead link gets a
 * real 404 status *and* the site's own 404 screen. Next's built-in fallback
 * would render outside this layout, unstyled and unbranded, because the app's
 * root layout lives under [lang].
 */
export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: false },
};

export default async function NotFoundRoute({
  params,
}: PageProps<"/[lang]/not-found">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <NotFoundView />;
}
