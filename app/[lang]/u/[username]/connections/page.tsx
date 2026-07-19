import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerifiedMark } from "@/components/verified-badge";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../../dictionaries";
import "../../../profile.css";

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
  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", profile.id),
  ]);
  const ids =
    activeTab === "followers"
      ? (followersResult.data ?? []).map((item) => item.follower_id)
      : (followingResult.data ?? []).map((item) => item.following_id);
  const { data: fetchedPeople } = ids.length
    ? await supabase
        .from("profiles")
        .select("id,username,display_name,bio,avatar_url,verified")
        .in("id", ids)
    : { data: [] };
  const normalizedQuery = query.toLocaleLowerCase(lang);
  const people = (fetchedPeople ?? []).filter(
    (person) =>
      !normalizedQuery ||
      person.username.toLocaleLowerCase(lang).includes(normalizedQuery) ||
      person.display_name?.toLocaleLowerCase(lang).includes(normalizedQuery),
  );
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
          <span>{followersResult.data?.length ?? 0}</span>
        </Link>
        <Link
          href={`/${lang}/u/${profile.username}/connections?tab=following${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          aria-current={activeTab === "following" ? "page" : undefined}
        >
          {pt ? "Seguindo" : "Following"}{" "}
          <span>{followingResult.data?.length ?? 0}</span>
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
        <div className="profile-connections-grid">
          {people.map((person) => (
            <article key={person.id} className="profile-connection-card">
              <Link
                href={`/${lang}/u/${person.username}`}
                aria-label={`@${person.username}`}
              >
                <span className="profile-connection-avatar">
                  {person.avatar_url ? (
                    <Image
                      src={person.avatar_url}
                      alt=""
                      fill
                      sizes="52px"
                      unoptimized
                    />
                  ) : (
                    person.username.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="profile-connection-copy">
                  <strong>
                    <span>{person.display_name || `@${person.username}`}</span>
                    {person.verified && <VerifiedMark size={16} />}
                  </strong>
                  <small>@{person.username}</small>
                  {person.bio && <p>{person.bio}</p>}
                </span>
                <ArrowRight className="profile-connection-arrow" size={16} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="social-empty profile-subpage-empty">
          <UserRound size={24} />
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
