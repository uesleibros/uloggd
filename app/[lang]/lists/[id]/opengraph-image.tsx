import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { getSupabase } from "@/lib/supabase/auth";
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

  const { data: list } = key
    ? await (
        await getSupabase()
      )
        .from("game_lists")
        .select(
          "name,description,ranked,game_list_items(id),profiles!game_lists_profile_id_fkey(username,display_name)",
        )
        .eq(key[0], key[1])
        .maybeSingle()
    : { data: null };

  const eyebrow = tri(lang, "LISTA", "LIST", "LISTA");
  if (!list)
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

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const count = Array.isArray(list.game_list_items)
    ? list.game_list_items.length
    : 0;

  return ogResponse({
    eyebrow: list.ranked ? tri(lang, "RANKING", "RANKING", "RANKING") : eyebrow,
    title: list.name,
    subtitle:
      tri(lang, "por ", "by ", "por ") +
      (owner?.display_name || `@${owner?.username ?? ""}`),
    body: clamp(list.description, 140),
    fallbackText: list.name,
    stats: [
      {
        value: String(count),
        label: tri(lang, "JOGOS", "GAMES", "JUEGOS"),
      },
    ],
  });
}
