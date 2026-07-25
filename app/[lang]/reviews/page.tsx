import { BookOpen, CalendarDays, EyeOff, Layers3, Star } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import { tri, uiText } from "@/lib/ui-text";

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
  const t = uiText(lang);
  return (
    <main className="social-page workspace-layout-page reviews-page">
      <WorkspaceHero
        profile={profile}
        title={tri(
          lang,
          "Diário e avaliações",
          "Diary & reviews",
          "Diario y reseñas",
        )}
        description={tri(
          lang,
          "Todas as sessões e opiniões que formam sua jornada.",
          "Every session and opinion that shapes your journey.",
          "Todas las sesiones y opiniones que forman tu recorrido.",
        )}
        stats={[
          {
            icon: <BookOpen size={14} />,
            label: t.reviews,
            value: reviews.length,
          },
          {
            icon: <Star size={14} />,
            label: tri(lang, "Nota média", "Average", "Nota media"),
            value:
              average === null
                ? "—"
                : `${average.toLocaleString(lang, { maximumFractionDigits: 1 })}/5`,
          },
          {
            icon: <CalendarDays size={14} />,
            label: t.sessions,
            value: sessions.length,
          },
          {
            icon: <EyeOff size={14} />,
            label: tri(lang, "Spoilers", "Spoilers", "Spoilers"),
            value: reviews.filter((entry) => entry.spoilers).length,
          },
        ]}
      />
      <div className="workspace-page-body">
        <nav
          className="game-page-nav"
          aria-label={tri(
            lang,
            "Filtrar registros",
            "Filter entries",
            "Filtrar registros",
          )}
        >
          {[
            {
              value: "all",
              label: tri(lang, "Tudo", "All", "Todo"),
              icon: <Layers3 size={14} />,
            },
            { value: "review", label: t.reviews, icon: <Star size={14} /> },
            {
              value: "diary",
              label: t.sessions,
              icon: <CalendarDays size={14} />,
            },
          ].map(({ value, label, icon }) => (
            <Link
              key={value}
              href={
                value === "all"
                  ? `/${lang}/reviews`
                  : `/${lang}/reviews?type=${value}`
              }
              aria-current={activeType === value ? "page" : undefined}
            >
              {icon}
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
