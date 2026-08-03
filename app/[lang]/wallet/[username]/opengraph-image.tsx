import { ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { getSupabase } from "@/lib/supabase/auth";
import { getProfileLevel } from "@/lib/profile-level";
import { getProfileMinerals } from "@/lib/minerals";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";

export const alt = "Carteira no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; username: string }> };

/**
 * The card for a wallet link.
 *
 * A wallet is public the way a level is, so this shows what somebody holds
 * rather than refusing to describe the page. What it does not show is the
 * transfer ledger, which belongs to the two accounts in it.
 *
 * The three figures are chosen to be legible at a glance: how many minerals,
 * how much of the set, and the rarest one held. A list of six counts would be
 * unreadable at this size and says less.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, username } = await params;
  const lang = resolveLocale(rawLang);
  const supabase = await getSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,verified,account_type")
    .ilike("username", username)
    .maybeSingle();

  const eyebrow = tri(lang, "CARTEIRA", "WALLET", "CARTERA");
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

  const [holdings, standing] = await Promise.all([
    getProfileMinerals(supabase, profile.id),
    getProfileLevel(supabase, profile.id),
  ]);
  const owned = holdings.reduce((sum, holding) => sum + holding.amount, 0);
  const kinds = holdings.filter((holding) => holding.amount > 0).length;
  // Highest rank held, which is the one worth naming: the rarest thing in a
  // collection is what a collection is about.
  const rarest = [...holdings]
    .filter((holding) => holding.amount > 0)
    .sort((a, b) => b.rank - a.rank)[0];
  const names: Record<string, string> = {
    COPPER: tri(lang, "COBRE", "COPPER", "COBRE"),
    IRON: tri(lang, "FERRO", "IRON", "HIERRO"),
    GOLD: tri(lang, "OURO", "GOLD", "ORO"),
    EMERALD: tri(lang, "ESMERALDA", "EMERALD", "ESMERALDA"),
    DIAMOND: tri(lang, "DIAMANTE", "DIAMOND", "DIAMANTE"),
    RUBY: tri(lang, "RUBI", "RUBY", "RUBÍ"),
  };

  return ogResponse({
    eyebrow,
    title: profile.display_name || `@${profile.username}`,
    subtitle: `@${profile.username}`,
    body:
      owned > 0
        ? tri(
            lang,
            "Minérios ganhos subindo de nível no uloggd.",
            "Minerals earned by levelling up on uloggd.",
            "Minerales ganados subiendo de nivel en uloggd.",
          )
        : tri(
            lang,
            "Ainda sem minérios. Cada nível alcançado sorteia um.",
            "No minerals yet. Every level reached draws one.",
            "Todavía sin minerales. Cada nivel alcanzado sortea uno.",
          ),
    image: await renderableImage(profile.avatar_url),
    fallbackText: profile.display_name || profile.username,
    imageShape: profile.account_type === "ORGANIZATION" ? "rounded" : "circle",
    verified: Boolean(profile.verified),
    level: standing?.level ?? null,
    stats: [
      {
        value: String(owned),
        label: tri(lang, "MINÉRIOS", "MINERALS", "MINERALES"),
      },
      {
        value: `${kinds}/${holdings.length}`,
        label: tri(lang, "TIPOS", "KINDS", "TIPOS"),
      },
      {
        value: rarest ? String(rarest.amount) : "0",
        label: rarest
          ? names[rarest.mineral]
          : tri(lang, "MAIS RARO", "RAREST", "MÁS RARO"),
      },
    ],
  });
}
