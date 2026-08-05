import "server-only";
import { clamp, ogResponse } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { getOgSupabase } from "@/lib/supabase/og";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The card for one of somebody's workspaces: their library, their reviews,
 * their screenshots.
 *
 * One builder rather than three routes with the same body. They differ only in
 * which table is counted and what the eyebrow says, and three copies of a card
 * is how three cards end up looking like three different sites.
 *
 * A private profile keeps its card but loses its count, the same rule the
 * profile card follows: hiding the existence of an account whose URL somebody
 * already has protects nothing, while the number is exactly what the setting
 * is about.
 */
export type WorkspaceKind = "library" | "reviews" | "shots";

const WORKSPACES: Record<
  WorkspaceKind,
  {
    table: string;
    column: string;
    eyebrow: (lang: UiLang) => string;
    label: (lang: UiLang) => string;
  }
> = {
  library: {
    table: "user_games",
    column: "igdb_id",
    eyebrow: (lang) => tri(lang, "BIBLIOTECA", "LIBRARY", "BIBLIOTECA"),
    label: (lang) => tri(lang, "JOGOS", "GAMES", "JUEGOS"),
  },
  reviews: {
    table: "reviews",
    column: "id",
    eyebrow: (lang) => tri(lang, "AVALIAÇÕES", "REVIEWS", "RESEÑAS"),
    label: (lang) => tri(lang, "AVALIAÇÕES", "REVIEWS", "RESEÑAS"),
  },
  shots: {
    table: "screenshots",
    column: "id",
    eyebrow: (lang) => tri(lang, "CAPTURAS", "SCREENSHOTS", "CAPTURAS"),
    label: (lang) => tri(lang, "CAPTURAS", "SCREENSHOTS", "CAPTURAS"),
  },
};

export async function workspaceCard(
  kind: WorkspaceKind,
  username: string,
  lang: UiLang,
) {
  const workspace = WORKSPACES[kind];
  const eyebrow = workspace.eyebrow(lang);
  const supabase = getOgSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id,username,display_name,bio,avatar_url,banner_url,account_type,is_private",
    )
    .ilike("username", username)
    .maybeSingle();

  if (!profile)
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

  const [{ count }, avatar, backdrop] = await Promise.all([
    profile.is_private
      ? Promise.resolve({ count: null })
      : supabase
          .from(workspace.table)
          .select(workspace.column, { count: "exact", head: true })
          .eq("profile_id", profile.id),
    renderableImage(profile.avatar_url),
    renderableImage(profile.banner_url, { width: 1200, height: 630 }),
  ]);

  return ogResponse({
    eyebrow,
    title: profile.display_name || `@${profile.username}`,
    subtitle: `@${profile.username}`,
    body: clamp(profile.bio, 130),
    image: avatar,
    backdrop,
    fallbackText: profile.display_name || profile.username,
    // Organizations are squared everywhere else in the interface, and a card
    // that rounds them would read as a different account.
    imageShape: profile.account_type === "ORGANIZATION" ? "rounded" : "circle",
    stats:
      count === null
        ? []
        : [{ value: String(count ?? 0), label: workspace.label(lang) }],
  });
}
