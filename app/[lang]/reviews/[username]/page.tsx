import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";
import { ReviewsWorkspacePage } from "@/components/social/reviews-owner-workspace";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { ProfileSummaryCount } from "@/components/social/profile-summary-count";
import { ProfileArchive } from "@/components/social/profile-archive";
import { socialMetadata } from "@/lib/seo";
import { getPublicProfile } from "@/lib/profiles";
import { getAuthUser } from "@/lib/supabase/auth";
import { tri, uiText } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";

type Props = {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  const title = tri(
    lang,
    `Avaliações de @${username}`,
    `@${username}'s reviews`,
    `Reseñas de @${username}`,
  );
  const description = tri(
    lang,
    `Avaliações e sessões de jogos publicadas por @${username}.`,
    `Game reviews and play sessions published by @${username}.`,
    `Reseñas y sesiones publicadas por @${username}.`,
  );
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: `/reviews/${username}`,
      title,
      description,
      type: "profile",
    }),
  };
}

export default async function ReviewsByUsernamePage({
  params,
  searchParams,
}: Props) {
  const [{ lang, username }, requested] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!hasLocale(lang)) notFound();
  const [response, viewer] = await Promise.all([
    getPublicProfile(username),
    getAuthUser(),
  ]);
  const profile = response?.data;
  if (!profile?.username) notFound();
  const viewerId = viewer?.id ?? null;
  if (viewerId && viewerId === profile.id)
    return (
      <ReviewsWorkspacePage
        profile={profile}
        lang={lang}
        requested={requested}
        userId={viewerId}
      />
    );

  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;
  const base = `/${lang}/reviews/${profile.username}`;
  return (
    <main className="social-page workspace-layout-page reviews-page">
      <WorkspaceHero
        profile={profile}
        title={tri(
          lang,
          `Avaliações de ${name}`,
          `${name}'s reviews`,
          `Reseñas de ${name}`,
        )}
        description={tri(
          lang,
          `O arquivo público de críticas e jornadas de @${profile.username}.`,
          `@${profile.username}'s public archive of reviews and journeys.`,
          `El archivo público de reseñas y recorridos de @${profile.username}.`,
        )}
        stats={[
          {
            icon: <BookOpen size={14} />,
            label: t.reviews,
            value: (
              <ProfileSummaryCount
                username={profile.username}
                field="reviews"
              />
            ),
          },
          {
            icon: <CalendarDays size={14} />,
            label: t.sessions,
            value: (
              <ProfileSummaryCount username={profile.username} field="diary" />
            ),
          },
        ]}
      />
      <div className="workspace-page-body reviews-workspace">
        <Link
          className="page-back-link"
          href={`/${lang}/u/${profile.username}`}
        >
          <ArrowLeft size={15} /> {t.backToProfile}
        </Link>
        <ProfileArchive
          username={profile.username}
          profileId={profile.id}
          lang={lang}
          viewerId={viewerId}
          base={base}
        />
      </div>
    </main>
  );
}
