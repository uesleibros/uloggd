import type { Metadata } from "next";
import { ArrowLeft, BookOpen, CalendarDays, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../../dictionaries";
import "../../../profile.css";

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
    getActivity(supabase, { profileId: profile.id, limit: 100 }),
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
  const pt = lang === "pt-BR";
  const name = profile.display_name || `@${profile.username}`;

  return (
    <main className="social-page profile-subpage">
      <Link
        className="profile-subpage-back"
        href={`/${lang}/u/${profile.username}`}
      >
        <ArrowLeft size={15} /> {pt ? "Voltar ao perfil" : "Back to profile"}
      </Link>
      <header className="profile-subpage-header">
        <span>
          <BookOpen size={14} /> {pt ? "HISTÓRICO PÚBLICO" : "PUBLIC HISTORY"}
        </span>
        <h1>{pt ? `Atividade de ${name}` : `${name}'s activity`}</h1>
        <p>
          {pt
            ? "Avaliações e sessões que fazem parte desta jornada."
            : "Reviews and sessions that are part of this journey."}
        </p>
      </header>
      <div className="profile-subpage-summary">
        <span>
          <Star size={14} />
          <strong>{reviewCount.count ?? 0}</strong>
          {pt ? "avaliações" : "reviews"}
        </span>
        <span>
          <CalendarDays size={14} />
          <strong>{diaryCount.count ?? 0}</strong>
          {pt ? "sessões" : "sessions"}
        </span>
      </div>
      <nav
        className="social-filter-tabs"
        aria-label={pt ? "Filtrar atividade" : "Filter activity"}
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
                ? `/${lang}/u/${profile.username}/activity`
                : `/${lang}/u/${profile.username}/activity?type=${value}`
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
        viewerId={viewer?.id}
      />
    </main>
  );
}
