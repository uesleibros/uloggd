import { BookOpen, CalendarDays, EyeOff, Star } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";

export default async function ReviewsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/reviews">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/reviews`);
  const [entries, { data: profile }] = await Promise.all([
    getActivity(supabase, {
      profileId: user.id,
      limit: 60,
    }),
    supabase
      .from("profiles")
      .select("username,display_name,avatar_url,banner_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  const requestedType = (await searchParams).type;
  const activeType =
    requestedType === "review" || requestedType === "diary"
      ? requestedType
      : "all";
  const visibleEntries =
    activeType === "all"
      ? entries
      : entries.filter((entry) => entry.kind === activeType);
  const reviews = entries.filter((entry) => entry.kind === "review");
  const sessions = entries.filter((entry) => entry.kind === "diary");
  const ratedReviews = reviews.filter(
    (entry): entry is typeof entry & { rating: number } =>
      typeof entry.rating === "number",
  );
  const average = ratedReviews.length
    ? ratedReviews.reduce((sum, entry) => sum + entry.rating, 0) /
      ratedReviews.length /
      20
    : null;
  const pt = lang === "pt-BR";
  return (
    <main className="social-page workspace-layout-page reviews-page">
      <WorkspaceHero
        profile={profile}
        eyebrow={
          <>
            <BookOpen size={14} /> {pt ? "SEU HISTÓRICO" : "YOUR HISTORY"}
          </>
        }
        title={pt ? "Diário e avaliações" : "Diary & reviews"}
        description={
          pt
            ? "Todas as sessões e opiniões que formam sua jornada."
            : "Every session and opinion that shapes your journey."
        }
        stats={[
          {
            icon: <BookOpen size={14} />,
            label: pt ? "Avaliações" : "Reviews",
            value: reviews.length,
          },
          {
            icon: <Star size={14} />,
            label: pt ? "Nota média" : "Average",
            value:
              average === null
                ? "—"
                : `${average.toLocaleString(lang, { maximumFractionDigits: 1 })}/5`,
          },
          {
            icon: <CalendarDays size={14} />,
            label: pt ? "Sessões" : "Sessions",
            value: sessions.length,
          },
          {
            icon: <EyeOff size={14} />,
            label: pt ? "Spoilers" : "Spoilers",
            value: reviews.filter((entry) => entry.spoilers).length,
          },
        ]}
      />
      <div className="workspace-page-body">
        <nav
          className="social-filter-tabs"
          aria-label={pt ? "Filtrar registros" : "Filter entries"}
        >
          {[
            ["all", pt ? "Tudo" : "All"],
            ["review", pt ? "Avaliações" : "Reviews"],
            ["diary", pt ? "Sessões" : "Sessions"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={
                value === "all"
                  ? `/${lang}/reviews`
                  : `/${lang}/reviews?type=${value}`
              }
              aria-current={activeType === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <ActivityStream
          entries={visibleEntries}
          lang={lang}
          viewerId={user.id}
        />
        <LoadMoreActivity
          lang={lang}
          viewerId={user.id}
          profileId={user.id}
          kind={activeType === "all" ? undefined : activeType}
          initialCursor={
            entries.length ? entries[entries.length - 1].createdAt : null
          }
          hasMore={entries.length === 60}
        />
      </div>
    </main>
  );
}
