import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Ban,
  BookOpen,
  CalendarDays,
  Gamepad2,
  List,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { ActivityStream } from "@/components/social/activity-stream";
import { FollowButton } from "@/components/social/follow-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { ProfileActions } from "@/components/profile-actions";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import {
  ProfileComments,
  type ProfileComment,
} from "@/components/social/profile-comments";
import { getGamesByIds } from "@/lib/igdb";
import { getListPreviews } from "@/lib/lists";
import { getActivity } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";
import "../../profile.css";
import { uiText, type UiLang } from "@/lib/ui-text";

type Props = PageProps<"/[lang]/u/[username]">;

// Each section below fans out into its own Supabase/IGDB lookups, so they
// stream independently instead of blocking the profile header.
async function ProfileRecentGames({
  profileId,
  viewerId,
  lang,
}: {
  profileId: string;
  viewerId: string | null;
  lang: UiLang;
}) {
  const supabase = await getSupabase();
  const [{ data: records }, { data: viewerPreference }] = await Promise.all([
    supabase
      .from("user_games")
      .select(
        "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
      )
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false })
      .limit(5),
    viewerId && viewerId !== profileId
      ? supabase
          .from("profiles")
          .select("custom_cover_scope")
          .eq("id", viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!records?.length) return null;
  const showCreatorCovers =
    viewerId === profileId ||
    viewerPreference?.custom_cover_scope === "EVERYONE";
  const games = await getGamesByIds(records.map((record) => record.igdb_id));
  const byId = new Map(games.map((game) => [game.id, game]));
  const pt = lang === "pt-BR";
  return (
    <section className="profile-shelf">
      <div className="social-section-title">
        <div>
          <h2>{pt ? "Jogos recentes" : "Recent games"}</h2>
          <p>
            {pt ? "Últimas mudanças na biblioteca" : "Latest library changes"}
          </p>
        </div>
      </div>
      <div className="cover-shelf">
        {records.map((record) => {
          const game = byId.get(record.igdb_id);
          return game ? (
            <QuickGameCard
              key={game.id}
              game={game}
              initial={{
                ...record,
                custom_cover_url: showCreatorCovers
                  ? record.custom_cover_url
                  : null,
              }}
              lang={lang}
              enabled={viewerId === profileId}
            />
          ) : null;
        })}
      </div>
    </section>
  );
}

async function ProfileActivity({
  profileId,
  viewerId,
  lang,
}: {
  profileId: string;
  viewerId: string | null;
  lang: UiLang;
}) {
  const supabase = await getSupabase();
  const entries = await getActivity(supabase, {
    profileId,
    limit: 20,
    viewerId,
  });
  return (
    <ActivityStream
      entries={entries}
      lang={lang}
      viewerId={viewerId ?? undefined}
    />
  );
}

async function ProfileListsAside({
  profileId,
  viewerId,
  lang,
}: {
  profileId: string;
  viewerId: string | null;
  lang: UiLang;
}) {
  const supabase = await getSupabase();
  const lists = await getListPreviews(supabase, {
    ownerId: profileId,
    viewerId,
    publicOnly: true,
    limit: 4,
  });
  const pt = lang === "pt-BR";
  if (!lists.length)
    return (
      <p className="profile-lists-empty">
        {pt ? "Nenhuma lista pública." : "No public lists."}
      </p>
    );
  return lists.map((list) => (
    <ListPreviewCard
      key={list.id}
      list={{
        id: list.id,
        name: list.name,
        description: list.description,
        visibility: list.visibility,
        count: list.count,
      }}
      covers={list.covers}
      lang={lang}
      likes={list.likes}
    />
  ));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  const supabase = await getSupabase();
  let { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,bio,avatar_url,banner_url")
    .ilike("username", username)
    .maybeSingle();
  if (!profile?.username) {
    const { data: alias } = await supabase.rpc("resolve_username_alias", {
      candidate: username,
    });
    if (alias) {
      const result = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,avatar_url,banner_url")
        .ilike("username", alias)
        .maybeSingle();
      profile = result.data;
    }
  }
  if (!profile?.username)
    return {
      title: lang === "pt-BR" ? "Perfil não encontrado" : "Profile not found",
    };
  // Nothing about a suspended account should reach link previews or search.
  const { data: suspension } = await supabase.rpc("profile_suspension", {
    target: profile.id,
  });
  if (suspension?.length)
    return {
      title: lang === "pt-BR" ? "Conta suspensa" : "Account suspended",
      robots: { index: false, follow: false },
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

function SuspendedProfile({
  lang,
  username,
  until,
}: {
  lang: UiLang;
  username: string;
  until: string | null;
}) {
  const pt = lang === "pt-BR";
  return (
    <main className="profile-page">
      <section className="profile-suspended">
        <span aria-hidden>
          <Ban size={24} />
        </span>
        <h1>{pt ? "Conta suspensa" : "Account suspended"}</h1>
        <p>
          {pt
            ? `O perfil de @${username} está indisponível porque a conta foi suspensa por violar as diretrizes do uloggd.`
            : `@${username}'s profile is unavailable because the account was suspended for breaking the uloggd guidelines.`}
        </p>
        {until && (
          <small>
            {pt ? "Suspensão até " : "Suspended until "}
            {new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(
              new Date(until),
            )}
          </small>
        )}
        <Link href={`/${lang}`}>{pt ? "Voltar ao início" : "Back home"}</Link>
      </section>
    </main>
  );
}

export default async function ProfilePage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const [{ data: profile }, user] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,username,display_name,pronouns,bio,drawer,thought,avatar_url,banner_url,created_at,verified,youtube_username,instagram_username,twitter_username,profile_comment_scope",
      )
      .ilike("username", username)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!profile?.username) {
    const { data: alias } = await supabase.rpc("resolve_username_alias", {
      candidate: username,
    });
    if (alias) redirect(`/${lang}/u/${alias}`);
    notFound();
  }
  // A suspended profile reads as unavailable to everyone, so none of the
  // counts, shelves or comments below are even queried.
  const { data: suspension } = await supabase.rpc("profile_suspension", {
    target: profile.id,
  });
  if (suspension?.length) {
    return (
      <SuspendedProfile
        lang={lang}
        username={profile.username}
        until={suspension[0].banned_until}
      />
    );
  }
  const [
    libraryCount,
    listsCount,
    reviewCount,
    diaryCount,
    followerCount,
    followingCount,
    followState,
    mutualRecentResult,
    blockStateResult,
    commentsResult,
  ] = await Promise.all([
    supabase
      .from("user_games")
      .select("igdb_id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("game_lists")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("visibility", "PUBLIC"),
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
    user && user.id !== profile.id
      ? supabase.rpc("is_recent_mutual_follow", {
          target_profile: profile.id,
        })
      : Promise.resolve({ data: false }),
    user && user.id !== profile.id
      ? supabase.rpc("get_profile_block_state", {
          target_profile: profile.id,
        })
      : Promise.resolve({
          data: [{ viewer_blocked: false, blocked_by_target: false }],
        }),
    supabase.rpc("get_profile_comment_threads", {
      target_profile: profile.id,
      root_limit: 30,
    }),
  ]);
  const blockState = Array.isArray(blockStateResult.data)
    ? blockStateResult.data[0]
    : blockStateResult.data;
  const viewerBlocked = Boolean(blockState?.viewer_blocked);
  const blockedByTarget = Boolean(blockState?.blocked_by_target);
  const interactionBlocked = viewerBlocked || blockedByTarget;
  const commentRows = (commentsResult.data ?? []) as Omit<
    ProfileComment,
    "author" | "like_count" | "liked_by_viewer"
  >[];
  const { data: commentLikes } = commentRows.length
    ? await supabase.rpc("get_content_likes", {
        target_type: "profile_comment",
        target_ids: commentRows.map((comment) => comment.id),
      })
    : { data: [] };
  const commentLikesById = new Map<
    string,
    { like_count: number; liked_by_viewer: boolean }
  >(
    (
      (commentLikes ?? []) as {
        content_id: string;
        like_count: number;
        liked_by_viewer: boolean;
      }[]
    ).map((like) => [
      like.content_id,
      {
        like_count: Number(like.like_count),
        liked_by_viewer: Boolean(like.liked_by_viewer),
      },
    ]),
  );
  const commentAuthorIds = [
    ...new Set(commentRows.map((comment) => comment.author_id)),
  ];
  const { data: commentAuthors } = commentAuthorIds.length
    ? await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,verified")
        .in("id", commentAuthorIds)
    : { data: [] };
  const commentAuthorById = new Map(
    (commentAuthors ?? []).map((author) => [author.id, author]),
  );
  const comments = commentRows.flatMap((comment) => {
    const author = commentAuthorById.get(comment.author_id);
    const like = commentLikesById.get(comment.id) ?? {
      like_count: 0,
      liked_by_viewer: false,
    };
    return author?.username
      ? [{ ...comment, ...like, author } as ProfileComment]
      : [];
  });
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const joined = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(profile.created_at));
  return (
    <main className="profile-page">
      <div
        className="profile-banner"
        data-empty={!profile.banner_url || undefined}
      >
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
              <svg
                className="profile-thought-tail"
                width="16"
                height="14"
                viewBox="0 0 16 14"
                aria-hidden
              >
                <path
                  className="profile-thought-tail-fill"
                  d="M0.5 0 L15 0 L0.5 13 Z"
                />
                <path
                  className="profile-thought-tail-line"
                  d="M15 0.5 L0.5 13 L0.5 0"
                />
              </svg>
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
              <div className="profile-meta-row">
                <p className="profile-handle">
                  @{profile.username}
                  {profile.pronouns ? ` · ${profile.pronouns}` : ""}
                </p>
                <p className="profile-joined">
                  <CalendarDays size={13} />{" "}
                  {pt ? "No uloggd desde" : "On uloggd since"} {joined}
                </p>
              </div>
            </div>
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div
            className="profile-connections-summary"
            aria-label={pt ? "Conexões" : "Connections"}
          >
            <Link
              href={`/${lang}/u/${profile.username}/connections?tab=following`}
            >
              <strong>{followingCount.count ?? 0}</strong>
              <span>{t.following}</span>
            </Link>
            <Link
              href={`/${lang}/u/${profile.username}/connections?tab=followers`}
            >
              <strong>{followerCount.count ?? 0}</strong>
              <span>{t.followers}</span>
            </Link>
          </div>
          <div className="profile-action-cluster">
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
              viewerBlocked={viewerBlocked}
              blockedByTarget={blockedByTarget}
            />
            {user?.id === profile.id ? (
              <Link
                className="profile-edit-link"
                href={`/${lang}/settings?tab=profile`}
              >
                <Settings size={15} /> {pt ? "Editar perfil" : "Edit profile"}
              </Link>
            ) : !interactionBlocked ? (
              <FollowButton
                viewerId={user?.id ?? null}
                profileId={profile.id}
                initial={Boolean(followState.data)}
                mutualRecent={Boolean(mutualRecentResult.data)}
                profileName={profile.display_name || `@${profile.username}`}
                lang={lang}
              />
            ) : null}
          </div>
        </div>
      </header>
      <nav
        className="profile-stats"
        aria-label={pt ? "Explorar perfil" : "Explore profile"}
      >
        <Link href={`/${lang}/u/${profile.username}/library`}>
          <span className="profile-stat-label">
            <Gamepad2 size={14} /> {t.games}
          </span>
          <strong>{libraryCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/activity?type=review`}>
          <span className="profile-stat-label">
            <Star size={14} /> {t.reviews}
          </span>
          <strong>{reviewCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/activity?type=diary`}>
          <span className="profile-stat-label">
            <BookOpen size={14} /> {t.sessions}
          </span>
          <strong>{diaryCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/u/${profile.username}/lists`}>
          <span className="profile-stat-label">
            <List size={14} /> {t.lists}
          </span>
          <strong>{listsCount.count ?? 0}</strong>
        </Link>
        <Link
          href={`/${lang}/u/${profile.username}/year/${new Date().getUTCFullYear()}`}
        >
          <span className="profile-stat-label">
            <Sparkles size={14} /> {pt ? "Retrospectiva" : "Wrapped"}
          </span>
          <strong>{new Date().getUTCFullYear()}</strong>
        </Link>
      </nav>
      {interactionBlocked ? (
        <section className="profile-blocked-notice">
          <Ban size={22} />
          <div>
            <h2>{pt ? "Interação indisponível" : "Interaction unavailable"}</h2>
            <p>
              {viewerBlocked
                ? pt
                  ? "Você bloqueou esta conta. Desbloqueie para voltar a ver e interagir com o conteúdo."
                  : "You blocked this account. Unblock it to see and interact with its content again."
                : pt
                  ? "Não é possível visualizar ou interagir com o conteúdo desta conta."
                  : "You cannot view or interact with this account's content."}
            </p>
          </div>
        </section>
      ) : (
        <>
          {profile.drawer && (
            <section className="profile-drawer">
              <div className="social-section-title">
                <div>
                  <h2>Drawer</h2>
                  <p>
                    {pt
                      ? `Um cantinho de ${profile.display_name || `@${profile.username}`}`
                      : `A corner curated by ${profile.display_name || `@${profile.username}`}`}
                  </p>
                </div>
              </div>
              <div className="profile-drawer-body">
                <MarkdownContent content={profile.drawer} lang={lang} />
              </div>
            </section>
          )}
          {(libraryCount.count ?? 0) > 0 && (
            <Suspense
              fallback={
                <section
                  className="profile-shelf"
                  aria-busy="true"
                  aria-label="Loading"
                >
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
                    {Array.from({ length: 5 }, (_, index) => (
                      <span
                        className="skeleton-block shelf-cover-skeleton"
                        key={index}
                      />
                    ))}
                  </div>
                </section>
              }
            >
              <ProfileRecentGames
                profileId={profile.id}
                viewerId={user?.id ?? null}
                lang={lang}
              />
            </Suspense>
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
              <Suspense
                fallback={
                  <div
                    className="skeleton-stream"
                    aria-busy="true"
                    aria-label="Loading"
                  >
                    {Array.from({ length: 3 }, (_, index) => (
                      <div className="skeleton-entry" key={index}>
                        <span className="skeleton-block" />
                        <div>
                          <span className="skeleton-block" />
                          <span className="skeleton-block" />
                          <span className="skeleton-block" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              >
                <ProfileActivity
                  profileId={profile.id}
                  viewerId={user?.id ?? null}
                  lang={lang}
                />
              </Suspense>
            </div>
            <aside className="profile-lists">
              <div className="social-section-title">
                <h2>{t.lists}</h2>
                <Link href={`/${lang}/u/${profile.username}/lists`}>
                  {pt ? "Ver todas" : "View all"}
                </Link>
              </div>
              <Suspense
                fallback={
                  <div
                    className="lists-loading-card"
                    aria-busy="true"
                    aria-label="Loading"
                  >
                    <span className="skeleton-block" />
                    <div>
                      <span className="skeleton-block" />
                      <span className="skeleton-block" />
                    </div>
                  </div>
                }
              >
                <ProfileListsAside
                  profileId={profile.id}
                  viewerId={user?.id ?? null}
                  lang={lang}
                />
              </Suspense>
            </aside>
          </section>
          <ProfileComments
            profileId={profile.id}
            viewerId={user?.id ?? null}
            comments={comments}
            commentsClosed={profile.profile_comment_scope === "NOBODY"}
            canComment={Boolean(
              user &&
              profile.profile_comment_scope !== "NOBODY" &&
              (user.id === profile.id ||
                profile.profile_comment_scope === "EVERYONE" ||
                followState.data),
            )}
            lang={lang}
          />
        </>
      )}
    </main>
  );
}
