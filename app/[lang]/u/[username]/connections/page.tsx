import type { Metadata } from "next";
import { ArrowLeft, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionCard } from "@/components/social/connection-card";
import { LoadMoreConnections } from "@/components/social/load-more-connections";
import { getConnectionsPage } from "@/lib/connections";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, resolveLocale } from "../../../dictionaries";
import "../../../profile.css";
import { tri, uiText } from "@/lib/ui-text";

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, username } = await params;
  const lang = resolveLocale(rawLang);
  return {
    title: tri(
      lang,
      `Conexões de @${username}`,
      `@${username}'s connections`,
      `Conexiones de @${username}`,
    ),
  };
}

export default async function ProfileConnectionsPage({
  params,
  searchParams,
}: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name")
    .ilike("username", username)
    .maybeSingle();
  if (!profile?.username) notFound();

  const requested = await searchParams;
  const query = requested.q?.trim() ?? "";
  const activeTab = requested.tab === "following" ? "following" : "followers";
  // Tab counts are head counts and the page itself is keyset-paginated on
  // follows(created_at); searches filter server-side and are capped at 60.
  const [followersResult, followingResult, rows] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    getConnectionsPage(supabase, {
      profileId: profile.id,
      tab: activeTab,
      query: query || undefined,
      limit: query ? 60 : PAGE_SIZE,
    }),
  ]);
  const people = rows.map((row) => row.person);
  const initialCursor = rows.length ? rows[rows.length - 1].created_at : null;
  const hasMore = !query && rows.length === PAGE_SIZE;
  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <main className="social-page profile-subpage">
      <Link className="page-back-link" href={`/${lang}/u/${profile.username}`}>
        <ArrowLeft size={15} /> {t.backToProfile}
      </Link>
      <header className="profile-subpage-header">
        <h1>
          {tri(
            lang,
            `Conexões de ${name}`,
            `${name}'s connections`,
            `Conexiones de ${name}`,
          )}
        </h1>
      </header>
      <nav
        className="social-filter-tabs"
        aria-label={tri(
          lang,
          "Filtrar conexões",
          "Filter connections",
          "Filtrar conexiones",
        )}
      >
        <Link
          href={`/${lang}/u/${profile.username}/connections?tab=followers${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          aria-current={activeTab === "followers" ? "page" : undefined}
        >
          {t.followers} <span>{followersResult.count ?? 0}</span>
        </Link>
        <Link
          href={`/${lang}/u/${profile.username}/connections?tab=following${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          aria-current={activeTab === "following" ? "page" : undefined}
        >
          {t.following} <span>{followingResult.count ?? 0}</span>
        </Link>
      </nav>
      <form className="profile-connections-search">
        <label className="search-field-hit">
          <Search size={16} />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={tri(
              lang,
              "Buscar por nome ou @usuário",
              "Search name or @user",
              "Buscar por nombre o @usuario",
            )}
            aria-label={tri(
              lang,
              "Buscar conexões",
              "Search connections",
              "Buscar conexiones",
            )}
          />
        </label>
        <input type="hidden" name="tab" value={activeTab} />
        <button type="submit">{t.search}</button>
      </form>
      {people.length ? (
        <>
          <div className="profile-connections-grid">
            {people.map((person) => (
              <ConnectionCard key={person.id} person={person} lang={lang} />
            ))}
          </div>
          <LoadMoreConnections
            profileId={profile.id}
            tab={activeTab}
            lang={lang}
            pageSize={PAGE_SIZE}
            initialCursor={initialCursor}
            hasMore={hasMore}
          />
        </>
      ) : (
        <div className="social-empty profile-subpage-empty">
          <span aria-hidden>
            <UserRound size={22} />
          </span>
          <h2>
            {query
              ? tri(
                  lang,
                  "Nenhuma conexão encontrada",
                  "No connections found",
                  "No se encontraron conexiones",
                )
              : tri(
                  lang,
                  "Ninguém por aqui ainda",
                  "No one here yet",
                  "Todavía no hay nadie por aquí",
                )}
          </h2>
          <p>
            {tri(
              lang,
              "Esta parte da rede ainda está vazia.",
              "This part of the network is still empty.",
              "Esta parte de la red todavía está vacía.",
            )}
          </p>
        </div>
      )}
    </main>
  );
}
