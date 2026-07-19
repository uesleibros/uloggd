import { redirect } from "next/navigation";

export default async function ProfileSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { lang } = await params;
  const tab = (await searchParams).tab ?? "profile";
  redirect(`/${lang}/settings?tab=${encodeURIComponent(tab)}`);
}
