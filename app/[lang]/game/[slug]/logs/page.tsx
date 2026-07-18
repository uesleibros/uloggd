import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { getGameBySlug } from "@/lib/igdb";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../../dictionaries";

type Props = PageProps<"/[lang]/game/[slug]/logs">;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const game = await getGameBySlug(slug);
  return game
    ? {
        title:
          lang === "pt-BR" ? `Registros de ${game.name}` : `${game.name} logs`,
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
  const entries = (
    await getActivity(supabase, {
      profileId: user.id,
      gameId: game.id,
      limit: 100,
    })
  ).filter((entry) => entry.kind === "diary");
  const pt = lang === "pt-BR";
  const totalMinutes = entries.reduce(
    (total, entry) => total + (entry.minutes ?? 0),
    0,
  );
  const totalDays = entries.reduce((total, entry) => {
    if (!entry.playedOn) return total;
    if (!entry.endedOn) return total + 1;
    const span =
      Math.round(
        (Date.parse(entry.endedOn) - Date.parse(entry.playedOn)) / 86400000,
      ) + 1;
    return total + Math.max(1, span);
  }, 0);
  return (
    <main className="social-page game-logs-page">
      <Link className="page-back-link" href={`/${lang}/game/${slug}`}>
        <ArrowLeft size={14} /> {pt ? "Voltar ao jogo" : "Back to game"}
      </Link>
      <header className="social-page-header">
        <span>
          <CalendarDays size={14} /> {pt ? "SUA JORNADA" : "YOUR JOURNEY"}
        </span>
        <h1>{game.name}</h1>
        <p>
          {entries.length} {pt ? "registros" : "logs"}
          {totalDays > 0
            ? ` · ${totalDays} ${pt ? (totalDays === 1 ? "dia" : "dias") : totalDays === 1 ? "day" : "days"}`
            : ""}
          {totalMinutes > 0
            ? ` · ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
            : ""}
        </p>
      </header>
      <ActivityStream entries={entries} lang={lang} viewerId={user.id} />
    </main>
  );
}
