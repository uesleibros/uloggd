import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { getGameBySlug } from "@/lib/igdb";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../../dictionaries";
import { tri } from "@/lib/ui-text";

type Props = PageProps<"/[lang]/game/[slug]/logs">;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const game = await getGameBySlug(slug);
  return game
    ? {
        title: tri(
          lang,
          `Registros de ${game.name}`,
          `${game.name} logs`,
          `Registros de ${game.name}`,
        ),
        robots: { index: false, follow: false },
      }
    : {};
}
export default async function GameLogsPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [game, supabase] = await Promise.all([
    getGameBySlug(slug),
    getSupabase(),
  ]);
  if (!game) notFound();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/game/${slug}/logs`);
  // Header totals come from a lightweight scan of every session; the
  // hydrated stream below is paginated.
  const [{ data: sessions }, entries] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("played_on,ended_on,minutes")
      .eq("profile_id", user.id)
      .eq("igdb_id", game.id),
    getActivity(supabase, {
      profileId: user.id,
      gameId: game.id,
      limit: 30,
    }),
  ]);
  const stream = entries.filter((entry) => entry.kind === "diary");
  const totalMinutes = (sessions ?? []).reduce(
    (total, entry) => total + (entry.minutes ?? 0),
    0,
  );
  const totalDays = (sessions ?? []).reduce((total, entry) => {
    if (!entry.played_on) return total;
    if (!entry.ended_on) return total + 1;
    const span =
      Math.round(
        (Date.parse(entry.ended_on) - Date.parse(entry.played_on)) / 86400000,
      ) + 1;
    return total + Math.max(1, span);
  }, 0);
  return (
    <main className="social-page game-logs-page">
      <Link className="page-back-link" href={`/${lang}/game/${slug}`}>
        <ArrowLeft size={14} />{" "}
        {tri(lang, "Voltar ao jogo", "Back to game", "Volver al juego")}
      </Link>
      <header className="social-page-header">
        <span>
          <CalendarDays size={14} />{" "}
          {tri(lang, "SUA JORNADA", "YOUR JOURNEY", "TU RECORRIDO")}
        </span>
        <h1>{game.name}</h1>
        <p>
          {(sessions ?? []).length}{" "}
          {tri(lang, "registros", "logs", "registros")}
          {totalDays > 0
            ? ` · ${totalDays} ${tri(lang, totalDays === 1 ? "dia" : "dias", totalDays === 1 ? "day" : "days", totalDays === 1 ? "día" : "días")}`
            : ""}
          {totalMinutes > 0
            ? ` · ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
            : ""}
        </p>
      </header>
      <ActivityStream entries={stream} lang={lang} viewerId={user.id} />
      <LoadMoreActivity
        lang={lang}
        viewerId={user.id}
        profileId={user.id}
        gameId={game.id}
        kind="diary"
        initialCursor={
          entries.length ? entries[entries.length - 1].createdAt : null
        }
        hasMore={entries.length === 30}
      />
    </main>
  );
}
