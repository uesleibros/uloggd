import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Gamepad2,
  List,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { ActivityStream } from "@/components/social/activity-stream";
import { FollowButton } from "@/components/social/follow-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { ProfileActions } from "@/components/profile-actions";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";

type Props = PageProps<"/[lang]/u/[username]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  const supabase = await getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,bio,avatar_url,banner_url")
    .ilike("username", username)
    .maybeSingle();
  if (!profile?.username)
    return {
      title: lang === "pt-BR" ? "Perfil não encontrado" : "Profile not found",
    };
  const name = profile.display_name || `@${profile.username}`;
  const description =
    profile.bio?.slice(0, 180) ||
    (lang === "pt-BR"
      ? `Veja a biblioteca, avaliações e jornada de @${profile.username} no uloggd.`
      : `See @${profile.username}'s library, reviews, and gaming journey on uloggd.`);
  const image = profile.banner_url || profile.avatar_url || "/logo.jpg";
  return {
    title: name,
    description,
    alternates: { canonical: `/${lang}/u/${profile.username}` },
    openGraph: {
      title: `${name} · uloggd`,
      description,
      type: "profile",
      siteName: "uloggd",
      locale: lang === "pt-BR" ? "pt_BR" : "en_US",
      images: [{ url: image, alt: name }],
    },
    twitter: {
      card: profile.banner_url ? "summary_large_image" : "summary",
      title: `${name} · uloggd`,
      description,
      images: [image],
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const [{ data: profile }, user] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,username,display_name,pronouns,bio,thought,avatar_url,banner_url,created_at,verified,youtube_username,instagram_username,twitter_username",
      )
      .ilike("username", username)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!profile?.username) notFound();
  const [
    libraryResult,
    listsResult,
    reviewCount,
    diaryCount,
    followerCount,
    followingCount,
    followState,
    entries,
  ] = await Promise.all([
    supabase
      .from("user_games")
      .select(
        "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
        { count: "exact" },
      )
      .eq("profile_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("game_lists")
      .select(
        "id,name,description,visibility,game_list_items(igdb_id,position)",
        { count: "exact" },
      )
      .eq("profile_id", profile.id)
      .eq("visibility", "PUBLIC")
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("diary_entries")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    user && user.id !== profile.id
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getActivity(supabase, { profileId: profile.id, limit: 20 }),
  ]);
  const library = libraryResult.data ?? [];
  const lists = listsResult.data ?? [];
  const listGameIds = lists.flatMap((list) =>
    list.game_list_items.map((item) => item.igdb_id),
  );
  const [games, { data: listCoverRows }] = await Promise.all([
    getGamesByIds([...library.map((item) => item.igdb_id), ...listGameIds]),
    listGameIds.length
      ? supabase
          .from("user_games")
          .select("igdb_id,custom_cover_url")
          .eq("profile_id", profile.id)
          .in("igdb_id", listGameIds)
      : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map(games.map((game) => [game.id, game]));
  const listCoversById = new Map(
    (listCoverRows ?? []).map((item) => [item.igdb_id, item.custom_cover_url]),
  );
  const pt = lang === "pt-BR";
  const joined = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(profile.created_at));
  return (
    <main className="profile-page">
      <div className="profile-banner">
        {profile.banner_url && (
          <Image
            src={profile.banner_url}
            alt=""
            fill
            priority
            sizes="1200px"
            unoptimized
          />
        )}
      </div>
      <header className="profile-header">
        <div className="profile-avatar-anchor">
          {profile.thought && (
            <div className="profile-thought-bubble">
              <p>{profile.thought}</p>
            </div>
          )}
          <div className="profile-avatar">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                fill
                sizes="112px"
                unoptimized
              />
            ) : (
              profile.username.slice(0, 1).toUpperCase()
            )}
          </div>
        </div>
        <div className="profile-identity">
          <div className="profile-title-row">
            <div>
              <div className="profile-verified-title">
                <h1>{profile.display_name || `@${profile.username}`}</h1>
                {profile.verified && <VerifiedBadge lang={lang} />}
              </div>
              <p className="profile-handle">
                @{profile.username}
                {profile.pronouns ? ` · ${profile.pronouns}` : ""}
              </p>
            </div>
            {user?.id === profile.id ? (
              <Link
                className="profile-edit-link"
                href={`/${lang}/settings/profile`}
              >
                <Settings size={15} /> {pt ? "Editar perfil" : "Edit profile"}
              </Link>
            ) : (
              <FollowButton
                viewerId={user?.id ?? null}
                profileId={profile.id}
                initial={Boolean(followState.data)}
                lang={lang}
              />
            )}
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <p className="profile-joined">
            <CalendarDays size={13} />{" "}
            {pt ? "No uloggd desde" : "On uloggd since"} {joined}
          </p>
          {(profile.youtube_username ||
            profile.instagram_username ||
            profile.twitter_username) && (
            <nav
              className="profile-social-links"
              aria-label={pt ? "Redes sociais" : "Social networks"}
            >
              {profile.youtube_username && (
                <a
                  data-network="youtube"
                  href={`https://youtube.com/@${profile.youtube_username}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`YouTube · @${profile.youtube_username}`}
                >
                  <FaYoutube size={19} />
                </a>
              )}
              {profile.instagram_username && (
                <a
                  data-network="instagram"
                  href={`https://instagram.com/${profile.instagram_username}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Instagram · @${profile.instagram_username}`}
                >
                  <FaInstagram size={19} />
                </a>
              )}
              {profile.twitter_username && (
                <a
                  data-network="twitter"
                  href={`https://x.com/${profile.twitter_username}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Twitter / X · @${profile.twitter_username}`}
                >
                  <FaXTwitter size={18} />
                </a>
              )}
            </nav>
          )}
          <ProfileActions
            profileId={profile.id}
            viewerId={user?.id ?? null}
            username={profile.username}
            lang={lang}
          />
        </div>
      </header>
      <nav
        className="profile-stats"
        aria-label={pt ? "Explorar perfil" : "Explore profile"}
      >
        <Link href={`/${lang}/u/${profile.username}/library`}>
          <span className="profile-stat-label">
            <Gamepad2 size={14} /> {pt ? "Jogos" : "Games"}
          </span>
          <strong>{libraryResult.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/activity?type=review`}>
          <span className="profile-stat-label">
            <Star size={14} /> {pt ? "Avaliações" : "Reviews"}
          </span>
          <strong>{reviewCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/activity?type=diary`}>
          <span className="profile-stat-label">
            <BookOpen size={14} /> {pt ? "Sessões" : "Sessions"}
          </span>
          <strong>{diaryCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/lists`}>
          <span className="profile-stat-label">
            <List size={14} /> {pt ? "Listas" : "Lists"}
          </span>
          <strong>{listsResult.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/connections?tab=followers`}>
          <span className="profile-stat-label">
            <Users size={14} /> {pt ? "Seguidores" : "Followers"}
          </span>
          <strong>{followerCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/connections?tab=following`}>
          <span className="profile-stat-label">
            <Users size={14} /> {pt ? "Seguindo" : "Following"}
          </span>
          <strong>{followingCount.count ?? 0}</strong>
        </Link>
      </nav>
      {library.length > 0 && (
        <section className="profile-shelf">
          <div className="social-section-title">
            <div>
              <h2>{pt ? "Jogos recentes" : "Recent games"}</h2>
              <p>
                {pt
                  ? "Últimas mudanças na biblioteca"
                  : "Latest library changes"}
              </p>
            </div>
          </div>
          <div className="cover-shelf">
            {library.slice(0, 5).map((record) => {
              const game = byId.get(record.igdb_id);
              return game ? (
                <QuickGameCard
                  key={game.id}
                  game={game}
                  initial={record}
                  lang={lang}
                  enabled={user?.id === profile.id}
                />
              ) : null;
            })}
          </div>
        </section>
      )}
      <section className="profile-content-grid">
        <div>
          <div className="social-section-title">
            <div>
              <h2>{pt ? "Atividade" : "Activity"}</h2>
              <p>
                {pt
                  ? "Avaliações e sessões públicas"
                  : "Public reviews and sessions"}
              </p>
            </div>
          </div>
          <ActivityStream entries={entries} lang={lang} viewerId={user?.id} />
        </div>
        <aside className="profile-lists">
          <div className="social-section-title">
            <h2>{pt ? "Listas" : "Lists"}</h2>
            <Link href={`/${lang}/u/${profile.username}/lists`}>
              {pt ? "Ver todas" : "View all"}
            </Link>
          </div>
          {lists.length ? (
            lists.map((list) => {
              const items = [...list.game_list_items].sort(
                (a, b) => a.position - b.position,
              );
              const covers = items.slice(0, 5).flatMap((item) => {
                const game = byId.get(item.igdb_id);
                return game
                  ? [
                      {
                        url: resolveGameCover(
                          game.coverUrl,
                          listCoversById.get(game.id),
                        ),
                        name: game.name,
                      },
                    ]
                  : [];
              });
              return (
                <ListPreviewCard
                  key={list.id}
                  list={{
                    id: list.id,
                    name: list.name,
                    description: list.description,
                    visibility: list.visibility,
                    count: items.length,
                  }}
                  covers={covers}
                  lang={lang}
                />
              );
            })
          ) : (
            <p className="profile-lists-empty">
              {pt ? "Nenhuma lista pública." : "No public lists."}
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
