import { notFound, redirect } from "next/navigation";
import { serverApi, settleServer } from "@/lib/api-server";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function LibraryPage({
  params,
}: PageProps<"/[lang]/library">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  // `/me` answers for whoever the request belongs to, so no answer and being
  // signed out are the same thing here.
  const { data: me } = await settleServer(
    serverApi.get<{ owner: { username: string | null } }>("/me"),
  );
  if (!me) redirect(`/${lang}/login?next=/${lang}/library`);
  if (!me.owner.username) redirect(`/${lang}/onboarding/username`);
  redirect(`/${lang}/library/${me.owner.username}`);
}
