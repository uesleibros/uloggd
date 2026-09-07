import { notFound, redirect } from "next/navigation";
import { serverApi, settleServer } from "@/lib/api-server";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function ReviewsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/reviews">) {
  const [{ lang }, requested] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  // `/me` answers for whoever the request belongs to, so no answer and
  // being signed out are the same thing here.
  const { data: me } = await settleServer(
    serverApi.get<{ owner: { username: string | null } }>("/me"),
  );
  if (!me) redirect(`/${lang}/login?next=/${lang}/reviews`);
  if (!me.owner.username) redirect(`/${lang}/onboarding/username`);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(requested)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value))
      value.forEach((item) => query.append(key, item));
  }
  redirect(
    `/${lang}/reviews/${me.owner.username}${query.size ? `?${query}` : ""}`,
  );
}
