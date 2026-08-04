import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, Layers3, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { ReviewsWorkspacePage } from "@/components/social/reviews-owner-workspace";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { socialMetadata } from "@/lib/seo";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
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
  const supabase = await getSupabase();
  const [{ data: profile }, viewer] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,banner_url")
      .ilike("username", username)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!profile?.username) notFound();
  const viewerId = viewer?.id ?? null;
  if (viewerId && viewerId === profile.id)
    return (
      <ReviewsWorkspacePage
        lang={lang}
        requested={requested}
        userId={viewerId}
      />
    );

  const requestedType =
    typeof requested.type === "string" ? requested.type : "all";
  const activeType =
    requestedType === "review" || requestedType === "diary"
      ? requestedType
      : "all";
  const [entries, reviewCount, diaryCount] = await Promise.all([
    getActivity(supabase, {
      profileId: profile.id,
      viewerId,
      kinds: activeType === "all" ? ["review", "diary"] : [activeType],
      limit: 40,
    }),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("diary_entries")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
  ]);
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
            value: reviewCount.count ?? 0,
          },
          {
            icon: <CalendarDays size={14} />,
            label: t.sessions,
            value: diaryCount.count ?? 0,
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
        <nav
          className="game-page-nav reviews-scope-tabs"
          aria-label={tri(
            lang,
            "Filtrar arquivo",
            "Filter archive",
            "Filtrar archivo",
          )}
        >
          {[
            {
              value: "all",
              label: tri(lang, "Tudo", "All", "Todo"),
              icon: <Layers3 size={14} />,
              count: (reviewCount.count ?? 0) + (diaryCount.count ?? 0),
            },
            {
              value: "review",
              label: t.reviews,
              icon: <Star size={14} />,
              count: reviewCount.count ?? 0,
            },
            {
              value: "diary",
              label: t.sessions,
              icon: <CalendarDays size={14} />,
              count: diaryCount.count ?? 0,
            },
          ].map((item) => (
            <Link
              key={item.value}
              href={item.value === "all" ? base : `${base}?type=${item.value}`}
              aria-current={activeType === item.value ? "page" : undefined}
            >
              {item.icon}
              {item.label}
              <b>{item.count}</b>
            </Link>
          ))}
        </nav>
        <ActivityStream entries={entries} lang={lang} viewerId={viewerId} />
        <LoadMoreActivity
          lang={lang}
          viewerId={viewerId}
          profileId={profile.id}
          kind={activeType === "all" ? undefined : activeType}
          pageSize={40}
          initialCursor={
            entries.length ? entries[entries.length - 1].createdAt : null
          }
          hasMore={entries.length === 40}
        />
      </div>
    </main>
  );
}
