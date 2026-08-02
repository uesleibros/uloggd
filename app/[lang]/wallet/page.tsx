import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "../dictionaries";
import Image from "next/image";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getProfileLevel } from "@/lib/profile-level";
import {
  getProfileMinerals,
  MINERAL_ART,
  mineralOdds,
  totalWeight,
  type MineralKind,
} from "@/lib/minerals";
import { MineralHistory } from "@/components/mineral-history";
import { tri, type UiLang } from "@/lib/ui-text";

type Props = { params: Promise<{ lang: string }> };

const NAMES: Record<MineralKind, (lang: UiLang) => string> = {
  COPPER: (lang) => tri(lang, "Cobre", "Copper", "Cobre"),
  IRON: (lang) => tri(lang, "Ferro", "Iron", "Hierro"),
  GOLD: (lang) => tri(lang, "Ouro", "Gold", "Oro"),
  EMERALD: (lang) => tri(lang, "Esmeralda", "Emerald", "Esmeralda"),
  DIAMOND: (lang) => tri(lang, "Diamante", "Diamond", "Diamante"),
  RUBY: (lang) => tri(lang, "Rubi", "Ruby", "Rubí"),
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: tri(lang, "Carteira", "Wallet", "Cartera"),
    // Nobody else's wallet is at this URL and there is nothing here for a
    // crawler: it is one account's own inventory.
    robots: { index: false, follow: false },
  };
}

/**
 * Your own minerals, at a URL you can reach.
 *
 * The wallet first shipped inside the level dialog, which is the wrong place
 * for it: a thing people are told to collect has to be somewhere they can go,
 * not behind a badge they have to know to click. The compact version stays in
 * the dialog, where it explains the level; this is the page that answers
 * "where are mine".
 */
export default async function WalletPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/wallet`);

  const supabase = await getSupabase();
  const [holdings, standing] = await Promise.all([
    getProfileMinerals(supabase, user.id),
    getProfileLevel(supabase, user.id),
  ]);
  const total = totalWeight(holdings);
  const owned = holdings.reduce((sum, holding) => sum + holding.amount, 0);

  return (
    <main className="social-page wallet-page">
      <header className="social-page-header">
        <span>{tri(lang, "Carteira", "Wallet", "Cartera")}</span>
        <h1>
          {owned === 1
            ? tri(lang, "1 minério", "1 mineral", "1 mineral")
            : tri(
                lang,
                `${owned} minérios`,
                `${owned} minerals`,
                `${owned} minerales`,
              )}
        </h1>
        <p>
          {tri(
            lang,
            "Cada nível alcançado sorteia um minério. Eles vão servir para comprar coisas na loja.",
            "Every level reached draws one mineral. They will buy things in the shop.",
            "Cada nivel alcanzado sortea un mineral. Servirán para comprar cosas en la tienda.",
          )}
        </p>
      </header>

      <ol className="wallet-grid">
        {holdings.map((holding) => {
          const odds = mineralOdds(holding.weight, total);
          return (
            <li
              key={holding.mineral}
              data-empty={holding.amount === 0 || undefined}
            >
              <Image
                src={MINERAL_ART[holding.mineral]}
                alt=""
                width={72}
                height={72}
                aria-hidden
              />
              <strong>{holding.amount}</strong>
              <span>{NAMES[holding.mineral](lang)}</span>
              {/* Two decimals at the rare end: ruby is 0.2%, and a whole
                  number would print it as 0% and read as broken. */}
              <small>
                {odds < 1 ? odds.toFixed(2) : odds.toFixed(odds < 10 ? 1 : 0)}
                {tri(lang, "% por nível", "% per level", "% por nivel")}
              </small>
            </li>
          );
        })}
      </ol>

      {standing && (
        <p className="wallet-next">
          {tri(
            lang,
            `Você está no nível ${standing.level}. Faltam ${standing.next_level_at - standing.xp} XP para o próximo sorteio.`,
            `You are level ${standing.level}. ${standing.next_level_at - standing.xp} XP to the next draw.`,
            `Estás en el nivel ${standing.level}. Faltan ${standing.next_level_at - standing.xp} XP para el próximo sorteo.`,
          )}
        </p>
      )}

      <MineralHistory lang={lang} />
    </main>
  );
}
