import type { Metadata } from "next";
import { ArrowLeft, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionCard } from "@/components/social/connection-card";
import { LoadMoreConnections } from "@/components/social/load-more-connections";
import { getConnectionsPage } from "@/lib/connections";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../../dictionaries";
import "../../../profile.css";

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  return {
    title:
      lang === "pt-BR"
        ? `Conexões de @${username}`
        : `@${username}'s connections`,
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
  const pt = lang === "pt-BR";
  const name = profile.display_name || `@${profile.username}`;

  return (
    <main className="social-page profile-subpage">
      <Link
        className="profile-subpage-back"
        href={`/${lang}/u/${profile.username}`}
      >
        <ArrowLeft size={15} /> {pt ? "Voltar ao perfil" : "Back to profile"}
      </Link>
      <header className="profile-subpage-header">
        <span>
          <Users size={14} /> {pt ? "REDE" : "NETWORK"}
        </span>
        <h1>{pt ? `Conexões de ${name}` : `${name}'s connections`}</h1>
        <p>
          {pt
            ? "Pessoas que acompanham esta jornada e perfis seguidos por ela."
            : "People following this journey and profiles it follows."}
        </p>
      </header>
      <nav
        className="social-filter-tabs"
        aria-label={pt ? "Filtrar conexões" : "Filter connections"}
      >
        <Link
          href={`/${lang}/u/${profile.username}/connections?tab=followers${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          aria-current={activeTab === "followers" ? "page" : undefined}
        >
          {pt ? "Seguidores" : "Followers"}{" "}
          <span>{followersResult.count ?? 0}</span>
        </Link>
        <Link
          href={`/${lang}/u/${profile.username}/connections?tab=following${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          aria-current={activeTab === "following" ? "page" : undefined}
        >
          {pt ? "Seguindo" : "Following"}{" "}
          <span>{followingResult.count ?? 0}</span>
        </Link>
      </nav>
      <form className="profile-connections-search">
        <Search size={16} />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={
            pt ? "Buscar por nome ou @usuário" : "Search name or @user"
          }
          aria-label={pt ? "Buscar conexões" : "Search connections"}
        />
        <input type="hidden" name="tab" value={activeTab} />
        <button type="submit">{pt ? "Buscar" : "Search"}</button>
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
              ? pt
                ? "Nenhuma conexão encontrada"
                : "No connections found"
              : pt
                ? "Ninguém por aqui ainda"
                : "No one here yet"}
          </h2>
          <p>
            {pt
              ? "Esta parte da rede ainda está vazia."
              : "This part of the network is still empty."}
          </p>
        </div>
      )}
    </main>
  );
}
