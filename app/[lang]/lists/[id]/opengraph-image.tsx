import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { tierlistResponse } from "@/lib/og-tierlist-card";
import { cachedCardData, getOgSupabase } from "@/lib/supabase/og";
import { getTierlistPreview } from "@/lib/tierlists";
import { contentKey } from "@/lib/public-id";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";

export const alt = "Lista no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; id: string }> };

/**
 * The card for a list link.
 *
 * A private list resolves to nothing through the ordinary client, so it draws
 * the generic card rather than its name. That is the same rule the page
 * follows, reached the same way, rather than a second copy of the check.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, id } = await params;
  const lang = resolveLocale(rawLang);
  const key = contentKey(id);
  const eyebrow = tri(lang, "LISTA", "LIST", "LISTA");

  if (!key) {
    const index = await cachedCardData(["lists-index", id], async () => {
      const supabase = getOgSupabase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .ilike("username", id)
        .maybeSingle();
      if (!profile?.username) return null;
      const { count } = await supabase
        .from("game_lists")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("visibility", "PUBLIC");
      return {
        profile,
        count: count ?? 0,
        avatar: await renderableImage(profile.avatar_url),
      };
    });
    if (index) {
      const name = index.profile.display_name || `@${index.profile.username}`;
      return ogResponse({
        eyebrow: tri(lang, "LISTAS", "LISTS", "LISTAS"),
        title: tri(
          lang,
          `Listas de ${name}`,
          `${name}'s lists`,
          `Listas de ${name}`,
        ),
        subtitle: `@${index.profile.username}`,
        image: index.avatar,
        fallbackText: name,
        imageShape: "circle",
        stats: [
          {
            value: String(index.count),
            label: tri(lang, "LISTAS", "LISTS", "LISTAS"),
          },
        ],
      });
    }
  }

  const data = key
    ? await cachedCardData(["list", key[0], key[1]], async () => {
        const supabase = getOgSupabase();
        const { data: list } = await supabase
          .from("game_lists")
          .select(
            "id,name,description,ranked,kind,game_list_items(id),profiles!game_lists_profile_id_fkey(username,display_name,avatar_url,verified)",
          )
          .eq(key[0], key[1])
          .maybeSingle();
        if (!list) return null;
        const owner = Array.isArray(list.profiles)
          ? list.profiles[0]
          : list.profiles;
        const avatar = await renderableImage(owner?.avatar_url);
        if (list.kind === "TIERLIST") {
          const preview = await getTierlistPreview(supabase, list.id, {
            maxTiers: 4,
            maxCoversPerTier: 6,
          });
          return {
            list,
            avatar,
            preview: {
              count: preview.count,
              rows: preview.rows.map((row) => ({
                label: row.label,
                color: row.color,
                covers: row.covers.map((cover) => cover.url),
              })),
            },
          };
        }
        return { list, avatar, preview: null };
      })
    : null;

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

  const { list, avatar, preview } = data;
  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const count = Array.isArray(list.game_list_items)
    ? list.game_list_items.length
    : 0;

  if (preview) {
    const author = owner?.display_name || owner?.username || "uloggd";
    return tierlistResponse({
      title: list.name,
      body: clamp(list.description, 105),
      author,
      authorHandle: owner?.username ?? "uloggd",
      authorImage: avatar,
      verified: Boolean(owner?.verified),
      rows: preview.rows,
      gameCount: preview.count,
      gamesLabel: tri(lang, "JOGOS", "GAMES", "JUEGOS"),
      emptyLabel: tri(
        lang,
        "Tierlist ainda vazia",
        "Tier list is still empty",
        "Tierlist todavía vacía",
      ),
    });
  }

  return ogResponse({
    // `kind` was not selected, so every tierlist unfurled as "LIST" and every
    // ranked tierlist as "RANKING". The card has to name the thing the link
    // opens, or the preview is telling people something the page contradicts.
    eyebrow: list.ranked ? tri(lang, "RANKING", "RANKING", "RANKING") : eyebrow,
    title: list.name,
    subtitle:
      tri(lang, "por ", "by ", "por ") +
      (owner?.display_name || `@${owner?.username ?? ""}`),
    body: clamp(list.description, 140),
    image: avatar,
    fallbackText: owner?.display_name || owner?.username || list.name,
    imageShape: "circle",
    stats: [
      {
        value: String(count),
        label: tri(lang, "JOGOS", "GAMES", "JUEGOS"),
      },
    ],
  });
}
