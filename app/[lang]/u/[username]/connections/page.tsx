import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionsList } from "@/components/social/connections-list";
import { getPublicProfile } from "@/lib/profiles";
import { serverApi } from "@/lib/api-server";
import type { ProfileSummary } from "@/lib/profile-types";
import { getAuthUser } from "@/lib/supabase/auth";
import { hasLocale, resolveLocale } from "../../../dictionaries";
import "../../../profile.css";
import { tri, uiText } from "@/lib/ui-text";
import { socialMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ lang: rawLang, username }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const lang = resolveLocale(rawLang);
  const title = tri(
    lang,
    `Conexões de @${username}`,
    `@${username}'s connections`,
    `Conexiones de @${username}`,
  );
  const description = tri(
    lang,
    `Pessoas que seguem @${username} e perfis acompanhados por esta conta.`,
    `People following @${username} and profiles followed by this account.`,
    `Personas que siguen a @${username} y perfiles seguidos por esta cuenta.`,
  );
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: `/u/${username}/connections`,
      title,
      description,
      type: "profile",
    }),
    robots: query.q || query.tab ? { index: false, follow: true } : undefined,
  };
}

export default async function ProfileConnectionsPage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = (await getPublicProfile(username))?.data;
  if (!profile?.username) notFound();

  // The counts and who is asking; the people themselves are read in the
  // browser, per tab and search (see ConnectionsList).
  const [viewer, summary] = await Promise.all([
    getAuthUser(),
    serverApi.get<{ data: ProfileSummary }>(
      `/profiles/${encodeURIComponent(username)}/summary`,
    ),
  ]);
  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <main className="social-page profile-subpage">
      <Link className="page-back-link" href={`/${lang}/u/${profile.username}`}>
        <ArrowLeft size={15} /> {t.backToProfile}
      </Link>
      <header className="profile-subpage-header">
        <h1>
          {tri(
            lang,
            `Conexões de ${name}`,
            `${name}'s connections`,
            `Conexiones de ${name}`,
          )}
        </h1>
      </header>
      <ConnectionsList
        username={profile.username}
        lang={lang}
        viewerId={viewer?.id ?? null}
        followers={summary.data.followers ?? 0}
        following={summary.data.following ?? 0}
      />
    </main>
  );
}
