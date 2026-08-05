import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Building2,
  Globe,
  Users,
  CalendarDays,
  Gamepad2,
  Images,
  Wallet,
  List,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { SiSteam, SiTwitch } from "react-icons/si";
import { QuickGameCard } from "@/components/library/quick-game-card";
import {
  SteamPlayingPresence,
  TwitchLivePresence,
} from "@/components/profile-presence";
import { RecordView } from "@/components/record-view";
import { ActivityStream } from "@/components/social/activity-stream";
import { FollowButton } from "@/components/social/follow-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { ClaimLevelMinerals } from "@/components/claim-level-minerals";
import { SendMinerals } from "@/components/send-minerals";
import { getProfileLevel } from "@/lib/profile-level";
import { getProfileMinerals } from "@/lib/minerals";
import { RelativeTime } from "@/components/relative-time";
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
import { jsonLd, socialMetadata, SITE_URL } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";
import "../../profile.css";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { categoryLabel, displayUrl } from "@/lib/organization";

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
  return (
    <section className="profile-shelf">
      <div className="social-section-title">
        <div>
          <h2>
            {tri(lang, "Jogos recentes", "Recent games", "Juegos recientes")}
          </h2>
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
  if (!lists.length)
    return (
      <p className="profile-lists-empty">
        {tri(
          lang,
          "Nenhuma lista pública.",
          "No public lists.",
          "Ninguna lista pública.",
        )}
      </p>
    );
  return lists.map((list) => (
    <ListPreviewCard
      key={list.id}
      list={{
        id: list.id,
        publicId: list.publicId,
        name: list.name,
        description: list.description,
        visibility: list.visibility,
        ranked: list.ranked,
        kind: list.kind,
        count: list.count,
      }}
      covers={list.covers}
      tierRows={list.tierRows}
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
      title: tri(
        lang,
        "Perfil não encontrado",
        "Profile not found",
        "Perfil no encontrado",
      ),
    };
  // Nothing about a suspended account should reach link previews or search.
  const { data: suspension } = await supabase.rpc("profile_suspension", {
    target: profile.id,
  });
  if (suspension?.length)
    return {
      title: tri(
        lang,
        "Conta suspensa",
        "Account suspended",
        "Cuenta suspendida",
      ),
      robots: { index: false, follow: false },
    };
  const name = profile.display_name || `@${profile.username}`;
  const description =
    profile.bio?.slice(0, 180) ||
    tri(
      lang,
      `Veja a biblioteca, avaliações e jornada de @${profile.username} no uloggd.`,
      `See @${profile.username}'s library, reviews, and gaming journey on uloggd.`,
      `Mira la biblioteca, las reseñas y el recorrido de @${profile.username} en uloggd.`,
    );
  return {
    title: name,
    description,
    ...socialMetadata({
      lang,
      path: `/u/${profile.username}`,
      title: name,
      description,
      type: "profile",
      image: null,
      // The colocated generated card is always 1200x630, with the uploaded
      // banner as atmosphere and the avatar as identity when available.
      largeImage: true,
    }),
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
        <h1>
          {tri(
            lang,
            "Conta suspensa",
            "Account suspended",
            "Cuenta suspendida",
          )}
        </h1>
        <p>
          {pt
            ? `O perfil de @${username} está indisponível porque a conta foi suspensa por violar as diretrizes do uloggd.`
            : `@${username}'s profile is unavailable because the account was suspended for breaking the uloggd guidelines.`}
        </p>
        {until && (
          <small>
            {tri(
              lang,
              "Suspensão até ",
              "Suspended until ",
              "Suspensión hasta ",
            )}
            <RelativeTime value={until} lang={lang} />
          </small>
        )}
        <Link className="page-back-link" href={`/${lang}`}>
          <ArrowLeft size={15} />
          {tri(lang, "Voltar ao início", "Back home", "Volver al inicio")}
        </Link>
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
        "id,username,display_name,pronouns,bio,drawer,thought,avatar_url,banner_url,created_at,verified,verified_at,account_type,organization_tagline,organization_category,organization_url,is_private,youtube_username,instagram_username,twitter_username,twitch_username,twitch_live_visible,steam_id,steam_username,steam_playing_visible,profile_comment_scope",
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
  // A suspended profile reads as unavailable to everyone. The check used to
  // gate everything below it, which cost every visitor a round trip of its own
  // to rule out something almost nobody is. It goes out alongside the batch
  // now, and the batch is thrown away on the rare occasion it fires.
  const suspensionPromise = supabase.rpc("profile_suspension", {
    target: profile.id,
  });
  const batchPromise = Promise.all([
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
      .from("screenshots")
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
    // One aggregate for the level, alongside the counts rather than after
    // them: it reads six tables and would otherwise add a round trip to a page
    // that already waits on eleven.
    getProfileLevel(supabase, profile.id),
    getProfileMinerals(supabase, profile.id),
    // The viewer's own balances, for the send dialog's ceilings. Skipped
    // when there is nobody signed in or the profile is their own.
    user && user.id !== profile.id
      ? getProfileMinerals(supabase, user.id)
      : Promise.resolve([]),
  ]);
  const { data: suspension } = await suspensionPromise;
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
    screenshotCount,
    followerCount,
    followingCount,
    followState,
    mutualRecentResult,
    blockStateResult,
    commentsResult,
    standing,
    minerals,
    viewerWallet,
  ] = await batchPromise;
  const mineralCount = minerals.reduce((sum, held) => sum + held.amount, 0);
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
  const commentAuthorIds = [
    ...new Set(commentRows.map((comment) => comment.author_id)),
  ];
  const [{ data: commentLikes }, { data: commentAuthors }] = await Promise.all([
    commentRows.length
      ? supabase.rpc("get_content_likes", {
          target_type: "profile_comment",
          target_ids: commentRows.map((comment) => comment.id),
        })
      : Promise.resolve({ data: [] }),
    commentAuthorIds.length
      ? supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url,verified,account_type")
          .in("id", commentAuthorIds)
      : Promise.resolve({ data: [] }),
  ]);
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
  const t = uiText(lang);
  const organization = profile.account_type === "ORGANIZATION";
  // Who stands behind the account, for anyone deciding whether to trust it.
  // Only asked for organizations: the function returns nothing for a person,
  // and skipping the call keeps a personal profile from paying for it.
  const { data: memberRows } = organization
    ? await supabase.rpc("organization_members_of", { target: profile.id })
    : { data: null };
  const members =
    (memberRows as
      | {
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          role: "OWNER" | "MANAGER";
        }[]
      | null) ?? [];
  const profileUrl = `${SITE_URL}/${lang}/u/${profile.username}`;
  // Asked only when there is a channel to ask about and its owner agreed to be
  // surfaced, so a profile with no Twitch link never waits on Twitch at all.
  return (
    <main
      className="profile-page"
      style={
        profile.banner_url
          ? ({
              "--profile-banner-image": `url("${profile.banner_url.replace(/["\\\n\r]/g, encodeURIComponent)}")`,
            } as CSSProperties)
          : undefined
      }
      data-has-banner={Boolean(profile.banner_url) || undefined}
    >
      {/* Only on your own profile: it is the one page where finding out what
          a level paid out belongs, and the claim is idempotent so a refresh
          shows nothing rather than paying twice. */}
      {user?.id === profile.id && <ClaimLevelMinerals lang={lang} />}
      {/* A private profile is described to a crawler as existing and nothing
          more. Public ones carry the fields a search result can use: who this
          is, and what they publish here. Organizations describe themselves as
          such, since a store indexed as a person is wrong in a way that
          outlives the page. */}
      {!profile.is_private && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "@id": profileUrl,
            url: profileUrl,
            dateCreated: profile.created_at,
            inLanguage: lang,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            mainEntity: {
              "@type": organization ? "Organization" : "Person",
              name: profile.display_name || `@${profile.username}`,
              alternateName: `@${profile.username}`,
              url: profileUrl,
              image: profile.avatar_url ?? undefined,
              description:
                (organization
                  ? profile.organization_tagline || profile.bio
                  : profile.bio) ?? undefined,
              // Only links the account itself published, which is what sameAs
              // is for: statements by this entity about where else it is.
              sameAs: [
                profile.organization_url,
                profile.youtube_username &&
                  `https://youtube.com/@${profile.youtube_username}`,
                profile.instagram_username &&
                  `https://instagram.com/${profile.instagram_username}`,
                profile.twitter_username &&
                  `https://x.com/${profile.twitter_username}`,
                profile.twitch_username &&
                  `https://twitch.tv/${profile.twitch_username}`,
                profile.steam_id &&
                  `https://steamcommunity.com/profiles/${profile.steam_id}`,
              ].filter(Boolean),
            },
          })}
        />
      )}
      {user && user.id !== profile.id && (
        <RecordView type="profile" profileId={profile.id} />
      )}
      <div
        className="profile-banner"
        data-empty={!profile.banner_url || undefined}
      ></div>
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
          <div
            className="profile-avatar"
            data-account-type={profile.account_type}
          >
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
                {/* Before the verified mark: the level is the account describing
                    itself and the mark is moderation vouching for it, so the
                    claim reads before the confirmation of it. */}
                {standing && (
                  <ProfileLevelBadge lang={lang} standing={standing} />
                )}
                {profile.verified && (
                  <VerifiedBadge lang={lang} profileId={profile.id} />
                )}
              </div>
              {profile.account_type === "ORGANIZATION" && (
                <p className="profile-organization">
                  <Building2 size={13} aria-hidden />
                  <span>
                    {/* The category, when set, replaces the generic word:
                        "Loja" tells a visitor more than "Organização" does,
                        and it comes from a fixed list rather than from prose
                        the account wrote about itself. */}
                    {profile.organization_category
                      ? categoryLabel(profile.organization_category, lang)
                      : tri(
                          lang,
                          "Organização",
                          "Organization",
                          "Organización",
                        )}
                  </span>
                  {profile.organization_tagline && (
                    <small>{profile.organization_tagline}</small>
                  )}
                  {members.length > 0 && (
                    <span className="profile-organization-team">
                      <Users size={12} aria-hidden />
                      {members.slice(0, 3).map((member) => (
                        <Link
                          key={member.username}
                          href={`/${lang}/u/${member.username}`}
                        >
                          @{member.username}
                        </Link>
                      ))}
                      {members.length > 3 && <b>+{members.length - 3}</b>}
                    </span>
                  )}
                  {profile.organization_url && (
                    <a
                      className="profile-organization-site"
                      href={profile.organization_url}
                      // A profile is user-authored, so the link must not be
                      // able to reach back into this page or carry a referrer.
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                    >
                      <Globe size={12} aria-hidden />
                      {displayUrl(profile.organization_url)}
                    </a>
                  )}
                </p>
              )}
              <div className="profile-meta-row">
                <p className="profile-handle">
                  @{profile.username}
                  {profile.pronouns ? ` · ${profile.pronouns}` : ""}
                </p>
                <p className="profile-joined">
                  <CalendarDays size={13} />
                  {/* One span, so the words are separated by ordinary spaces.
                      As loose children of the flex row, each word was its own
                      flex item and picked up the 6px gap between every pair. */}
                  <span>
                    {tri(lang, "Entrou", "Joined", "Se unió")}{" "}
                    <RelativeTime value={profile.created_at} lang={lang} />
                  </span>
                </p>
                {/* Up here with the handle and the join date rather than down
                    the page. It is the one line about this person that stops
                    being true while somebody reads it, and the identity block
                    is where you look to find out who you are looking at right
                    now. Hidden when interaction is blocked, along with
                    everything else this account would be telling the viewer. */}
                {!interactionBlocked && (
                  <Suspense fallback={null}>
                    <SteamPlayingPresence
                      steamId={profile.steam_id}
                      visible={Boolean(profile.steam_playing_visible)}
                      lang={lang}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div
            className="profile-connections-summary"
            aria-label={tri(lang, "Conexões", "Connections", "Conexiones")}
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
              profile.twitter_username ||
              profile.twitch_username ||
              profile.steam_id) && (
              <nav
                className="profile-social-links"
                aria-label={tri(
                  lang,
                  "Redes sociais",
                  "Social networks",
                  "Redes sociales",
                )}
              >
                {profile.youtube_username && (
                  <a
                    data-network="youtube"
                    href={`https://youtube.com/@${profile.youtube_username}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`YouTube · @${profile.youtube_username}`}
                  >
                    <FaYoutube size={19} aria-hidden />
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
                    <FaInstagram size={19} aria-hidden />
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
                    <FaXTwitter size={18} aria-hidden />
                  </a>
                )}
                {profile.twitch_username && (
                  <a
                    data-network="twitch"
                    href={`https://twitch.tv/${profile.twitch_username}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Twitch · ${profile.twitch_username}`}
                  >
                    <SiTwitch size={17} aria-hidden />
                  </a>
                )}
                {profile.steam_id && (
                  <a
                    data-network="steam"
                    href={`https://steamcommunity.com/profiles/${profile.steam_id}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Steam · ${profile.steam_username ?? profile.steam_id}`}
                  >
                    <SiSteam size={18} aria-hidden />
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
                <Settings size={15} />{" "}
                {tri(lang, "Editar perfil", "Edit profile", "Editar perfil")}
              </Link>
            ) : !interactionBlocked ? (
              <>
                <FollowButton
                  viewerId={user?.id ?? null}
                  profileId={profile.id}
                  initial={Boolean(followState.data)}
                  mutualRecent={Boolean(mutualRecentResult.data)}
                  profileName={profile.display_name || `@${profile.username}`}
                  lang={lang}
                />
                {/* Only on somebody else's profile, and only for a signed-in
                    viewer: there is nobody to send to otherwise. The wallet
                    passed in is the sender's, for the ceilings on the
                    steppers; the database checks every amount again. */}
                {user && (
                  <SendMinerals
                    lang={lang}
                    recipientId={profile.id}
                    recipientName={
                      profile.display_name || `@${profile.username}`
                    }
                    wallet={viewerWallet}
                  />
                )}
              </>
            ) : null}
          </div>
        </div>
      </header>
      <nav
        className="profile-stats"
        aria-label={tri(
          lang,
          "Explorar perfil",
          "Explore profile",
          "Explorar perfil",
        )}
      >
        <Link href={`/${lang}/library/${profile.username}`}>
          <span className="profile-stat-label">
            <Gamepad2 size={14} /> {t.games}
          </span>
          <strong>{libraryCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/reviews/${profile.username}?type=review`}>
          <span className="profile-stat-label">
            <Star size={14} /> {t.reviews}
          </span>
          <strong>{reviewCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/reviews/${profile.username}?type=diary`}>
          <span className="profile-stat-label">
            <BookOpen size={14} /> {t.sessions}
          </span>
          <strong>{diaryCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/lists/${profile.username}`}>
          <span className="profile-stat-label">
            <List size={14} /> {t.lists}
          </span>
          <strong>{listsCount.count ?? 0}</strong>
        </Link>
        <Link href={`/${lang}/shots/${profile.username}`}>
          <span className="profile-stat-label">
            <Images size={14} />{" "}
            {tri(lang, "Capturas", "Screenshots", "Capturas")}
          </span>
          <strong>{screenshotCount.count ?? 0}</strong>
        </Link>
        {/* Beside the other workspaces rather than hidden in the level dialog:
            a wallet is a place, and this row is where places live. */}
        <Link href={`/${lang}/wallet/${profile.username}`}>
          <span className="profile-stat-label">
            <Wallet size={14} /> {tri(lang, "Carteira", "Wallet", "Cartera")}
          </span>
          <strong>{mineralCount}</strong>
        </Link>
        <Link
          href={`/${lang}/u/${profile.username}/year/${new Date().getUTCFullYear()}`}
        >
          <span className="profile-stat-label">
            <Sparkles size={14} />{" "}
            {tri(lang, "Retrospectiva", "Wrapped", "Retrospectiva")}
          </span>
          <strong>{new Date().getUTCFullYear()}</strong>
        </Link>
      </nav>
      {interactionBlocked ? (
        <section className="profile-blocked-notice">
          <Ban size={22} />
          <div>
            <h2>
              {tri(
                lang,
                "Interação indisponível",
                "Interaction unavailable",
                "Interacción no disponible",
              )}
            </h2>
            <p>
              {viewerBlocked
                ? tri(
                    lang,
                    "Você bloqueou esta conta. Desbloqueie para voltar a ver e interagir com o conteúdo.",
                    "You blocked this account. Unblock it to see and interact with its content again.",
                    "Bloqueaste esta cuenta. Desbloquéala para volver a ver su contenido e interactuar.",
                  )
                : tri(
                    lang,
                    "Não é possível visualizar ou interagir com o conteúdo desta conta.",
                    "You cannot view or interact with this account's content.",
                    "No puedes ver ni interactuar con el contenido de esta cuenta.",
                  )}
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Above the showcase, because it is the only thing down here that
              stops being true while somebody reads it. The Steam line is up in
              the identity block instead: it is one short sentence, and a whole
              card for it read as an announcement. */}
          <Suspense fallback={null}>
            <TwitchLivePresence
              username={profile.twitch_username}
              visible={Boolean(profile.twitch_live_visible)}
              name={profile.display_name || `@${profile.username}`}
              lang={lang}
            />
          </Suspense>
          {profile.drawer && (
            <section className="profile-drawer">
              <div className="social-section-title">
                <div>
                  <h2>{tri(lang, "Vitrine", "Showcase", "Vitrina")}</h2>
                </div>
              </div>
              <div className="profile-drawer-body">
                <MarkdownContent
                  content={profile.drawer}
                  lang={lang}
                  coverOwnerId={profile.id}
                />
              </div>
            </section>
          )}
          {(libraryCount.count ?? 0) > 0 && (
            <Suspense
              fallback={
                <section
                  className="profile-shelf"
                  aria-busy="true"
                  aria-label={t.loading}
                >
                  <div className="social-section-title">
                    <div>
                      <h2>
                        {tri(
                          lang,
                          "Jogos recentes",
                          "Recent games",
                          "Juegos recientes",
                        )}
                      </h2>
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
                  <h2>{tri(lang, "Atividade", "Activity", "Actividad")}</h2>
                </div>
              </div>
              <Suspense
                fallback={
                  <div
                    className="skeleton-stream"
                    aria-busy="true"
                    aria-label={t.loading}
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
                <Link href={`/${lang}/lists/${profile.username}`}>
                  {tri(lang, "Ver todas", "View all", "Ver todas")}
                </Link>
              </div>
              <Suspense
                fallback={
                  <div
                    className="lists-loading-card"
                    aria-busy="true"
                    aria-label={t.loading}
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
