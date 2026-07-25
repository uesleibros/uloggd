import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Layers3, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../../dictionaries";
import "../../../profile.css";
import { tri, uiText } from "@/lib/ui-text";

type Props = {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<{ type?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  return {
    title:
      lang === "pt-BR"
        ? `Atividade de @${username}`
        : `@${username}'s activity`,
  };
}

export default async function ProfileActivityPage({
  params,
  searchParams,
}: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const [{ data: profile }, viewer] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,username,display_name")
      .ilike("username", username)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!profile?.username) notFound();

  const [entries, reviewCount, diaryCount] = await Promise.all([
    getActivity(supabase, { profileId: profile.id, limit: 40 }),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("diary_entries")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
  ]);
  const requestedType = (await searchParams).type;
  const activeType =
    requestedType === "review" || requestedType === "diary"
      ? requestedType
      : "all";
  const visibleEntries =
    activeType === "all"
      ? entries
      : entries.filter((entry) => entry.kind === activeType);
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
            `Atividade de ${name}`,
            `${name}'s activity`,
            `Actividad de ${name}`,
          )}
        </h1>
      </header>
      <div className="profile-subpage-summary">
        <span>
          <Star size={14} />
          <strong>{reviewCount.count ?? 0}</strong>
          {tri(lang, "avaliações", "reviews", "valoraciones")}
        </span>
        <span>
          <CalendarDays size={14} />
          <strong>{diaryCount.count ?? 0}</strong>
          {tri(lang, "sessões", "sessions", "sesiones")}
        </span>
      </div>
      <nav
        className="game-page-nav"
        aria-label={tri(
          lang,
          "Filtrar atividade",
          "Filter activity",
          "Filtrar actividad",
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
                ? `/${lang}/u/${profile.username}/activity`
                : `/${lang}/u/${profile.username}/activity?type=${value}`
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
        viewerId={viewer?.id}
      />
      <LoadMoreActivity
        lang={lang}
        viewerId={viewer?.id}
        profileId={profile.id}
        kind={activeType === "all" ? undefined : activeType}
        pageSize={40}
        initialCursor={
          entries.length ? entries[entries.length - 1].createdAt : null
        }
        hasMore={entries.length === 40}
      />
    </main>
  );
}
