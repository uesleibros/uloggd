import { notFound, redirect } from "next/navigation";
import { serverApi, settleServer } from "@/lib/api-server";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function ListsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/lists">) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  // Through the API rather than the database. `/me` answers for whoever the
  // request belongs to, so a missing answer is the same as being signed out.
  const { data: me } = await settleServer(
    serverApi.get<{ owner: { username: string | null } }>("/me"),
  );
  if (!me) redirect(`/${lang}/login?next=/${lang}/lists`);
  if (!me.owner.username) redirect(`/${lang}/onboarding/username`);
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") next.set(key, value);
    else if (Array.isArray(value))
      value.forEach((item) => next.append(key, item));
  }
  redirect(`/${lang}/lists/${me.owner.username}${next.size ? `?${next}` : ""}`);
}
