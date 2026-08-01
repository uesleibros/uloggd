import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { getSupabase } from "@/lib/supabase/auth";
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
  const supabase = await getSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id,username,display_name,bio,avatar_url,account_type,organization_tagline,organization_category,is_private",
    )
    .ilike("username", username)
    .maybeSingle();

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

  const [{ count: games }, { count: reviews }, { count: followers }] =
    profile.is_private
      ? [{ count: null }, { count: null }, { count: null }]
      : await Promise.all([
          supabase
            .from("user_games")
            .select("igdb_id", { count: "exact", head: true })
            .eq("profile_id", profile.id),
          supabase
            .from("reviews")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", profile.id),
          supabase
            .from("follows")
            .select("follower_id", { count: "exact", head: true })
            .eq("following_id", profile.id),
        ]);

  return ogResponse({
    eyebrow,
    title: profile.display_name || `@${profile.username}`,
    subtitle: `@${profile.username}`,
    body: clamp(profile.organization_tagline || profile.bio, 130),
    image: await renderableImage(profile.avatar_url),
    fallbackText: profile.display_name || profile.username,
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
