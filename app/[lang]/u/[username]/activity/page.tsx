import { permanentRedirect } from "next/navigation";

export default async function LegacyProfileActivityPage({
  params,
  searchParams,
}: PageProps<"/[lang]/u/[username]/activity">) {
  const [{ lang, username }, query] = await Promise.all([params, searchParams]);
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") next.set(key, value);
    else if (Array.isArray(value))
      value.forEach((item) => next.append(key, item));
  }
  permanentRedirect(
    `/${lang}/reviews/${username}${next.size ? `?${next}` : ""}`,
  );
}
