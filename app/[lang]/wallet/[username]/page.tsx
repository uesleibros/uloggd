import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins, Gem, TrendingUp } from "lucide-react";
import { hasLocale } from "../../dictionaries";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getProfileLevel } from "@/lib/profile-level";
import { getProfileMinerals } from "@/lib/minerals";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { WalletWorkspace } from "@/components/wallet-workspace";
import { tri, uiText } from "@/lib/ui-text";
import { localeAlternates } from "@/lib/seo";

type Props = { params: Promise<{ lang: string; username: string }> };

async function loadProfile(username: string) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,banner_url")
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
  const title = tri(
    lang,
    `Carteira de ${name}`,
    `${name}'s wallet`,
    `Cartera de ${name}`,
  );
  const description = tri(
    lang,
    `Veja os minérios que @${profile.username} conquistou subindo de nível no uloggd.`,
    `See the minerals @${profile.username} earned by levelling up on uloggd.`,
    `Mira los minerales que @${profile.username} consiguió al subir de nivel en uloggd.`,
  );
  return {
    title,
    description,
    alternates: localeAlternates(lang, `/wallet/${profile.username}`),
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "website",
      siteName: "uloggd",
      url: `/${lang}/wallet/${profile.username}`,
      locale: tri(lang, "pt_BR", "en_US", "es_ES"),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · uloggd`,
      description,
    },
  };
}

/**
 * Somebody's minerals, laid out like every other workspace here.
 *
 * Public and keyed by username, the way `/library`, `/lists` and `/shots` are.
 * A wallet is part of a profile: hiding other people's would leave the number
 * on their level badge unexplainable, and half of what a collectible is for is
 * that other people can see it.
 *
 * What is not public is the ledger. Balances are a collection; who sent what
 * to whom belongs to the two accounts involved, which the row-level policy
 * enforces and the body only asks for when it is the owner looking.
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
  const name = profile.display_name || `@${profile.username}`;
  const owned = holdings.reduce((sum, holding) => sum + holding.amount, 0);
  const kinds = holdings.filter((holding) => holding.amount > 0).length;
  const t = uiText(lang);

  return (
    <main className="social-page wallet-page workspace-layout-page">
      <WorkspaceHero
        profile={profile}
        title={
          isOwner
            ? tri(lang, "Carteira", "Wallet", "Cartera")
            : tri(
                lang,
                `Carteira de ${name}`,
                `${name}'s wallet`,
                `Cartera de ${name}`,
              )
        }
        description={
          isOwner
            ? tri(
                lang,
                "Cada nível alcançado sorteia um minério. Eles vão servir para comprar coisas na loja.",
                "Every level reached draws one mineral. They will buy things in the shop.",
                "Cada nivel alcanzado sortea un mineral. Servirán para comprar cosas en la tienda.",
              )
            : tri(
                lang,
                "O que esta conta juntou subindo de nível.",
                "What this account has collected by levelling up.",
                "Lo que esta cuenta ha reunido subiendo de nivel.",
              )
        }
        stats={[
          {
            icon: <Coins size={14} />,
            label: tri(lang, "Minérios", "Minerals", "Minerales"),
            value: owned,
          },
          {
            icon: <Gem size={14} />,
            label: tri(lang, "Tipos", "Kinds", "Tipos"),
            value: `${kinds}/${holdings.length}`,
          },
          {
            icon: <TrendingUp size={14} />,
            label: tri(lang, "Nível", "Level", "Nivel"),
            value: standing?.level ?? 1,
          },
        ]}
      />
      <div className="workspace-page-body reviews-workspace">
        {/* First child of the body, exactly like /reviews and /shots. It was
            also rendered above the hero, so the page carried two of them. */}
        <Link
          className="page-back-link"
          href={`/${lang}/u/${profile.username}`}
        >
          <ArrowLeft size={15} /> {t.backToProfile}
        </Link>
        <WalletWorkspace
          holdings={holdings}
          lang={lang}
          profileId={profile.id}
          canClaim={isOwner}
        />
      </div>
    </main>
  );
}
