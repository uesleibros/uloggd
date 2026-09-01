import { getGamesByIds } from "@/lib/igdb";
import { ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { contentKey } from "@/lib/public-id";
import { cachedCardData, getOgSupabase } from "@/lib/supabase/og";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";

export const alt = "Jornada no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; id: string }> };

/**
 * The card for a journey link.
 *
 * A journey is a run through one game, so the game's cover carries it and the
 * counts say how much of it there is. The sessions are counted rather than
 * loaded: the card needs one number, not the rows behind it.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, id } = await params;
  const lang = resolveLocale(rawLang);
  const eyebrow = tri(lang, "JORNADA", "JOURNEY", "RECORRIDO");
  const key = contentKey(id);
  if (!key) return ogResponse({ eyebrow, title: "uloggd" });

  const data = await cachedCardData(["journey", key[0], key[1]], async () => {
    const supabase = getOgSupabase();
    const { data: journey } = await supabase
      .from("journeys")
      .select(
        "id,igdb_id,game_slug,title,profiles!journeys_profile_id_fkey(username,display_name)",
      )
      .eq(key[0], key[1])
      .maybeSingle();
    if (!journey) return null;
    const [game, { data: played }] = await Promise.all([
      getGamesByIds([journey.igdb_id]).then((games) => games[0]),
      supabase
        .from("diary_entries")
        .select("minutes")
        .eq("journey_id", journey.id),
    ]);
    return {
      journey,
      gameName: game?.name ?? null,
      cover: await renderableImage(game?.coverUrl),
      sessions: played?.length ?? 0,
      total: (played ?? []).reduce((sum, row) => sum + (row.minutes ?? 0), 0),
    };
  });

  if (!data)
    return ogResponse({
      eyebrow,
      title: "uloggd",
      body: tri(
        lang,
        "Diário e comunidade de jogos.",
        "A game journal and community.",
        "Diario y comunidad de juegos.",
      ),
    });

  const { journey, gameName, cover, sessions, total } = data;
  const author = Array.isArray(journey.profiles)
    ? journey.profiles[0]
    : journey.profiles;

  return ogResponse({
    eyebrow,
    title: journey.title || gameName || journey.game_slug,
    subtitle: author?.display_name
      ? `${author.display_name} · @${author.username}`
      : `@${author?.username ?? ""}`,
    body: gameName && journey.title ? gameName : null,
    image: cover,
    imageShape: "rounded",
    fallbackText: gameName ?? journey.game_slug,
    stats: [
      {
        value: String(sessions),
        label: tri(lang, "SESSÕES", "SESSIONS", "SESIONES"),
      },
      ...(total
        ? [
            {
              value: `${Math.floor(total / 60)}h`,
              label: tri(lang, "JOGADO", "PLAYED", "JUGADO"),
            },
          ]
        : []),
    ],
  });
}
