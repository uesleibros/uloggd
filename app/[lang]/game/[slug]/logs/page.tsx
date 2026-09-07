import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { getGameBySlug } from "@/lib/igdb";
import { serverApi } from "@/lib/api-server";
import type { SocialEntry } from "@/components/social/activity-stream";
import { getAuthUser } from "@/lib/supabase/auth";
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
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/game/${slug}/logs`);
  const result = await serverApi.get<{
    data: SocialEntry[];
    sessions: number;
    minutes: number;
    days: number;
  }>(
    `/games/${encodeURIComponent(slug)}/activity?profile=${user.id}&kinds=diary&limit=30`,
  );
  const entries = result.data,
    stream = entries,
    totalMinutes = result.minutes,
    totalDays = result.days;
  return (
    <main className="social-page game-logs-page">
      <Link className="page-back-link" href={`/${lang}/game/${slug}`}>
        <ArrowLeft size={14} />{" "}
        {tri(lang, "Voltar ao jogo", "Back to game", "Volver al juego")}
      </Link>
      <header className="social-page-header">
        <h1>{game.name}</h1>
        <p>
          {result.sessions} {tri(lang, "registros", "logs", "registros")}
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
