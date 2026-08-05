import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { cachedCardData, getOgSupabase } from "@/lib/supabase/og";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";
import { categoryLabel } from "@/lib/organization";

export const alt = "Perfil no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; username: string }> };

/**
 * The card for a profile link.
 *
 * Counts come from head queries rather than from loading rows, since the card
 * needs three numbers and nothing else, and these run on every unfurl.
 *
 * A private profile still gets a card: hiding the existence of an account
 * whose URL someone already has protects nothing, while an empty card looks
 * like the site is broken. What it does not get is the counts, since those are
 * exactly what the setting is about.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, username } = await params;
  const lang = resolveLocale(rawLang);
  // Everything the card reads, behind one cache entry. Supabase brings its own
  // fetch, which Next cannot see into, so without this the route stays dynamic
  // and the whole card is rebuilt on every unfurl.
  const data = await cachedCardData(["profile", username], async () => {
    const supabase = getOgSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id,username,display_name,bio,avatar_url,banner_url,account_type,organization_tagline,organization_category,is_private",
      )
      .ilike("username", username)
      .maybeSingle();
    if (!profile) return null;

    // Counts and pictures together. They were three stages in a row before,
    // and nothing in the second needs anything from the first.
    const [[games, reviews, followers], avatar, backdrop] = await Promise.all([
      profile.is_private
        ? Promise.resolve([null, null, null])
        : Promise.all([
            supabase
              .from("user_games")
              .select("igdb_id", { count: "exact", head: true })
              .eq("profile_id", profile.id)
              .then((result) => result.count),
            supabase
              .from("reviews")
              .select("id", { count: "exact", head: true })
              .eq("profile_id", profile.id)
              .then((result) => result.count),
            supabase
              .from("follows")
              .select("follower_id", { count: "exact", head: true })
              .eq("following_id", profile.id)
              .then((result) => result.count),
          ]),
      renderableImage(profile.avatar_url),
      renderableImage(profile.banner_url, { width: 1200, height: 630 }),
    ]);
    return { profile, games, reviews, followers, avatar, backdrop };
  });
  const profile = data?.profile;

  if (!profile)
    return ogResponse({
      eyebrow: tri(lang, "PERFIL", "PROFILE", "PERFIL"),
      title: "uloggd",
      body: tri(
        lang,
        "Diário e comunidade de jogos.",
        "A game journal and community.",
        "Diario y comunidad de juegos.",
      ),
    });

  const organization = profile.account_type === "ORGANIZATION";
  const eyebrow = organization
    ? profile.organization_category
      ? categoryLabel(profile.organization_category, lang).toUpperCase()
      : tri(lang, "ORGANIZAÇÃO", "ORGANIZATION", "ORGANIZACIÓN")
    : tri(lang, "PERFIL", "PROFILE", "PERFIL");

  const { games, reviews, followers, avatar, backdrop } = data;

  return ogResponse({
    eyebrow,
    title: profile.display_name || `@${profile.username}`,
    subtitle: `@${profile.username}`,
    body: clamp(profile.organization_tagline || profile.bio, 130),
    image: avatar,
    backdrop,
    fallbackText: profile.display_name || profile.username,
    // No level and no check mark here. A share card is read at a glance in a
    // group chat, where the name, the picture and the three counts are what
    // carry it; two more marks crowded that and said nothing a stranger
    // seeing the link for the first time needed. The level also cost six
    // table reads of its own on every unfurl.
    // Organizations are squared everywhere else in the interface, and a share
    // card that rounds them would read as a different account.
    imageShape: organization ? "rounded" : "circle",
    stats:
      games === null
        ? []
        : [
            {
              value: String(games ?? 0),
              label: tri(lang, "JOGOS", "GAMES", "JUEGOS"),
            },
            {
              value: String(reviews ?? 0),
              label: tri(lang, "AVALIAÇÕES", "REVIEWS", "RESEÑAS"),
            },
            {
              value: String(followers ?? 0),
              label: tri(lang, "SEGUIDORES", "FOLLOWERS", "SEGUIDORES"),
            },
          ],
  });
}
