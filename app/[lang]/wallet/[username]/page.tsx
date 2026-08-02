import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { hasLocale } from "../../dictionaries";
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

type Props = { params: Promise<{ lang: string; username: string }> };

const NAMES: Record<MineralKind, (lang: UiLang) => string> = {
  COPPER: (lang) => tri(lang, "Cobre", "Copper", "Cobre"),
  IRON: (lang) => tri(lang, "Ferro", "Iron", "Hierro"),
  GOLD: (lang) => tri(lang, "Ouro", "Gold", "Oro"),
  EMERALD: (lang) => tri(lang, "Esmeralda", "Emerald", "Esmeralda"),
  DIAMOND: (lang) => tri(lang, "Diamante", "Diamond", "Diamante"),
  RUBY: (lang) => tri(lang, "Rubi", "Ruby", "Rubí"),
};

async function loadProfile(username: string) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id,username,display_name")
    .eq("username", username)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  const profile = await loadProfile(username);
  if (!profile) return {};
  const name = profile.display_name || `@${profile.username}`;
  return {
    title: tri(
      lang,
      `Carteira de ${name}`,
      `${name}'s wallet`,
      `Cartera de ${name}`,
    ),
  };
}

/**
 * Somebody's minerals, at a URL like every other workspace here.
 *
 * Public and keyed by username, the way `/library`, `/lists` and `/shots` are.
 * A wallet is part of a profile: hiding other people's would leave the number
 * on their level badge unexplainable, and half of what a collectible is for is
 * that other people can see it.
 *
 * Only the owner's visit collects what is owed, which `MineralHistory` does.
 */
export default async function WalletPage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = await loadProfile(username);
  if (!profile?.username) notFound();

  const supabase = await getSupabase();
  const [holdings, standing, viewer] = await Promise.all([
    getProfileMinerals(supabase, profile.id),
    getProfileLevel(supabase, profile.id),
    getAuthUser(),
  ]);
  const isOwner = viewer?.id === profile.id;
  const total = totalWeight(holdings);
  const owned = holdings.reduce((sum, holding) => sum + holding.amount, 0);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <main className="social-page wallet-page">
      <Link className="page-back-link" href={`/${lang}/u/${profile.username}`}>
        <ArrowLeft size={14} />{" "}
        {tri(
          lang,
          `Voltar para ${name}`,
          `Back to ${name}`,
          `Volver a ${name}`,
        )}
      </Link>
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
          {isOwner
            ? tri(
                lang,
                "Cada nível alcançado sorteia um minério. Eles vão servir para comprar coisas na loja.",
                "Every level reached draws one mineral. They will buy things in the shop.",
                "Cada nivel alcanzado sortea un mineral. Servirán para comprar cosas en la tienda.",
              )
            : tri(
                lang,
                `O que ${name} juntou subindo de nível.`,
                `What ${name} has collected by levelling up.`,
                `Lo que ${name} ha reunido subiendo de nivel.`,
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

      {standing && isOwner && (
        <p className="wallet-next">
          {tri(
            lang,
            `Você está no nível ${standing.level}. Faltam ${standing.next_level_at - standing.xp} XP para o próximo sorteio.`,
            `You are level ${standing.level}. ${standing.next_level_at - standing.xp} XP to the next draw.`,
            `Estás en el nivel ${standing.level}. Faltan ${standing.next_level_at - standing.xp} XP para el próximo sorteo.`,
          )}
        </p>
      )}

      <MineralHistory
        lang={lang}
        profileId={profile.id}
        canClaim={isOwner}
        name={name}
      />
    </main>
  );
}
