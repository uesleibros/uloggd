import { getGamesByIds } from "@/lib/igdb";
import { ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { contentKey } from "@/lib/public-id";
import { getOgSupabase } from "@/lib/supabase/og";
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

  const supabase = getOgSupabase();
  const { data: journey } = await supabase
    .from("journeys")
    .select(
      "id,igdb_id,game_slug,title,profiles!journeys_profile_id_fkey(username,display_name)",
    )
    .eq(key[0], key[1])
    .maybeSingle();

  if (!journey)
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

  const author = Array.isArray(journey.profiles)
    ? journey.profiles[0]
    : journey.profiles;
  // One read of the sessions, not two: the rows carry their own count, and a
  // separate head query for it would be a round trip to learn the length of a
  // list already in hand.
  const [game, { data: played }] = await Promise.all([
    getGamesByIds([journey.igdb_id]).then((games) => games[0]),
    supabase
      .from("diary_entries")
      .select("minutes")
      .eq("journey_id", journey.id),
  ]);
  const cover = await renderableImage(game?.coverUrl);
  const sessions = played?.length ?? 0;
  const total = (played ?? []).reduce(
    (sum, row) => sum + (row.minutes ?? 0),
    0,
  );

  return ogResponse({
    eyebrow,
    title: journey.title || game?.name || journey.game_slug,
    subtitle: author?.display_name
      ? `${author.display_name} · @${author.username}`
      : `@${author?.username ?? ""}`,
    body: game?.name && journey.title ? game.name : null,
    image: cover,
    imageShape: "rounded",
    fallbackText: game?.name ?? journey.game_slug,
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
