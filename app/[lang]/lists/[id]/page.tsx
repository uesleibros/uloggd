import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { LayoutGrid, Layers3, ListOrdered } from "lucide-react";
import { LikeButton } from "@/components/social/like-button";
import { RecordView } from "@/components/record-view";
import { ShareButton } from "@/components/share-button";
import { ListAddGame } from "@/components/social/list-add-game";
import { ListItemsGrid } from "@/components/social/list-items-grid";
import { ListOwnerControls } from "@/components/social/list-owner-controls";
import { ListReport } from "@/components/social/list-report";
import { ListsByUsername } from "@/components/social/lists-by-username";
import {
  TierlistBoard,
  TierlistSkeleton,
} from "@/components/social/tierlist-board";
import { TierlistEditor } from "@/components/social/tierlist-editor";
import { getTierlist } from "@/lib/tierlists";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { ContentComments } from "@/components/social/content-comments";
import { VerifiedMark } from "@/components/verified-badge";
import { localeAlternates } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import {
  isMissingSchemaError,
  warnSchemaGap,
} from "@/lib/supabase/schema-fallback";
import { hasLocale } from "../../dictionaries";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Props = PageProps<"/[lang]/lists/[id]">;

function listKey(id: string) {
  if (/^[23456789A-HJ-NP-Za-km-z]{10}$/.test(id))
    return ["public_id", id] as const;
  if (/^[0-9a-f-]{36}$/i.test(id)) return ["id", id] as const;
  return null;
}

function ListAuthor({
  owner,
  lang,
}: {
  owner: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  } | null;
  lang: UiLang;
}) {
  if (!owner?.username) return null;
  return (
    <Link className="list-detail-author" href={`/${lang}/u/${owner.username}`}>
      <span>
        {owner.avatar_url ? (
          <Image src={owner.avatar_url} alt="" fill sizes="28px" unoptimized />
        ) : (
          owner.username.slice(0, 1).toUpperCase()
        )}
      </span>
      <small>
        {tri(lang, "por", "by", "por")}{" "}
        {owner.display_name || `@${owner.username}`}
      </small>
      {owner.verified && <VerifiedMark size={13} />}
    </Link>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang)) return {};
  const profileMetadata = {
    title: tri(lang, `Listas de @${id}`, `@${id}'s lists`, `Listas de @${id}`),
    description: tri(
      lang,
      `Coleções e tierlists publicadas por @${id}.`,
      `Collections and tier lists published by @${id}.`,
      `Colecciones y tierlists publicadas por @${id}.`,
    ),
    alternates: localeAlternates(lang, `/lists/${id}`),
  } satisfies Metadata;
  const key = listKey(id);
  if (!key) return profileMetadata;
  const { data: list } = await (
    await getSupabase()
  )
    .from("game_lists")
    .select(
      "public_id,name,description,profiles!game_lists_profile_id_fkey(username)",
    )
    .eq(key[0], key[1])
    .maybeSingle();
  if (!list) return profileMetadata;
  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const description =
    list.description ||
    tri(
      lang,
      `Uma lista de jogos criada por @${owner?.username} no uloggd.`,
      `A game list by @${owner?.username} on uloggd.`,
      `Una lista de juegos creada por @${owner?.username} en uloggd.`,
    );
  return {
    title: list.name,
    description,
    // Always the short id, never the uuid form of the same list — two URLs for
    // one page is exactly what a canonical exists to collapse.
    alternates: localeAlternates(lang, `/lists/${list.public_id}`),
    openGraph: {
      title: `${list.name} · uloggd`,
      description,
      type: "website",
      siteName: "uloggd",
    },
    twitter: { card: "summary", title: `${list.name} · uloggd`, description },
  };
}

// Streamed under Suspense: getTierlist fans out to IGDB for covers, the slow
// part of the page. The header renders first, this fills in behind the tier
// skeleton. The author always gets the editor; others get the board or, when
// nothing is ranked, the empty state.
async function TierlistBody({
  listId,
  ownerId,
  isOwner,
  lang,
}: {
  listId: string;
  ownerId: string;
  isOwner: boolean;
  lang: UiLang;
}) {
  const supabase = await getSupabase();
  const tierlist = await getTierlist(supabase, listId, ownerId, {
    includePool: isOwner,
  });
  if (isOwner)
    return <TierlistEditor listId={listId} initial={tierlist} lang={lang} />;
  if (tierlist.items.length)
    return (
      <TierlistBoard
        tiers={tierlist.tiers}
        items={tierlist.items}
        lang={lang}
        linkGames
      />
    );
  return (
    <div className="social-empty">
      <span aria-hidden>
        <LayoutGrid size={22} />
      </span>
      <h2>{tri(lang, "Tierlist vazia", "Empty tierlist", "Tierlist vacía")}</h2>
      <p>
        {tri(
          lang,
          "Nenhum jogo classificado ainda.",
          "No games ranked yet.",
          "Ningún juego clasificado todavía.",
        )}
      </p>
    </div>
  );
}

export default async function ListPage({ params, searchParams }: Props) {
  const [{ lang, id }, query] = await Promise.all([params, searchParams]);
  const key = listKey(id);
  if (!hasLocale(lang)) notFound();
  if (!key) return <ListsByUsername lang={lang} username={id} query={query} />;
  const supabase = await getSupabase();
  // Both selects are spelled out because supabase-js infers the row type from
  // the literal string; a built-up one degrades to a parser error type.
  const [listResult, user] = await Promise.all([
    supabase
      .from("game_lists")
      .select(
        "id,public_id,profile_id,name,description,visibility,ranked,kind,comments_scope,profiles!game_lists_profile_id_fkey(username,display_name,avatar_url,verified,content_comment_scope),game_list_items(id,igdb_id,game_slug,position,note)",
      )
      .eq(key[0], key[1])
      .maybeSingle(),
    getAuthUser(),
  ]);
  let list = listResult.data;
  // The ranked column ships with a migration that may not have run yet; a list
  // page is worth serving as a plain collection rather than 404ing over it.
  if (isMissingSchemaError(listResult.error)) {
    warnSchemaGap("game_lists.ranked (detail)", listResult.error);
    const { data: fallback } = await supabase
      .from("game_lists")
      .select(
        "id,public_id,profile_id,name,description,visibility,comments_scope,profiles!game_lists_profile_id_fkey(username,display_name,avatar_url,verified,content_comment_scope),game_list_items(id,igdb_id,game_slug,position,note)",
      )
      .eq(key[0], key[1])
      .maybeSingle();
    list = fallback
      ? ({ ...fallback, ranked: false } as NonNullable<typeof list>)
      : null;
  }
  if (!list) return <ListsByUsername lang={lang} username={id} query={query} />;
  if (key[0] === "id") permanentRedirect(`/${lang}/lists/${list.public_id}`);

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const isOwner = user?.id === list.profile_id;

  if (list.kind === "TIERLIST") {
    const t = uiText(lang);
    // The header only needs a cheap ranked count (no IGDB); the board itself
    // streams under Suspense with a tier-shaped skeleton, so the page never
    // flashes the collection cover-grid loader.
    const [{ data: likeRows }, { data: follow }, { data: liveIds }] =
      await Promise.all([
        supabase.rpc("get_content_likes", {
          target_type: "list",
          target_ids: [list.id],
        }),
        user
          ? supabase
              .from("follows")
              .select("follower_id")
              .eq("follower_id", user.id)
              .eq("following_id", list.profile_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.rpc("tierlist_live_ids", { target_list: list.id }),
      ]);
    const likeState = likeRows?.[0] as
      { like_count: number; liked_by_viewer: boolean } | undefined;
    const rankedCount = ((liveIds ?? []) as unknown[]).length;
    return (
      <main className="social-page">
        {user && <RecordView type="list" listId={list.id} />}
        <header className="list-detail-header">
          <h1>{list.name}</h1>
          <ListAuthor owner={owner} lang={lang} />
          {list.description && <p>{list.description}</p>}
          <div className="list-detail-meta">
            <span className="list-preview-mode" data-mode="tierlist">
              <LayoutGrid size={13} aria-hidden /> Tierlist
            </span>
            <small>
              {rankedCount} {t.gamesLower}
            </small>
          </div>
          <div className="list-detail-social">
            <LikeButton
              contentType="list"
              contentId={list.id}
              count={Number(likeState?.like_count ?? 0)}
              liked={Boolean(likeState?.liked_by_viewer)}
              canLike={Boolean(user) && !isOwner}
              lang={lang}
            />
            <ShareButton
              className="content-share-action"
              title={list.name}
              text={
                lang === "pt-BR"
                  ? `Tierlist por @${owner?.username} no uloggd`
                  : `Tierlist by @${owner?.username} on uloggd`
              }
              label={t.share}
              copiedLabel={t.linkCopied}
              lang={lang}
            />
            {user && !isOwner && (
              <ListReport
                listId={list.id}
                ownerId={list.profile_id}
                lang={lang}
              />
            )}
          </div>
          {isOwner && (
            <ListOwnerControls
              list={list}
              lang={lang}
              returnHref={`/${lang}/lists/${owner?.username}`}
            />
          )}
        </header>
        <Suspense fallback={<TierlistSkeleton />}>
          <TierlistBody
            listId={list.id}
            ownerId={list.profile_id}
            isOwner={isOwner}
            lang={lang}
          />
        </Suspense>
        <ContentComments
          contentType="list"
          contentId={list.id}
          ownerId={list.profile_id}
          viewerId={user?.id ?? null}
          canComment={
            Boolean(user) &&
            (isOwner ||
              owner?.content_comment_scope === "EVERYONE" ||
              (owner?.content_comment_scope === "FOLLOWERS" && Boolean(follow)))
          }
          commentsScope={
            owner?.content_comment_scope as "EVERYONE" | "FOLLOWERS" | "NOBODY"
          }
          lang={lang}
        />
      </main>
    );
  }

  const items = [...(list.game_list_items ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const [
    games,
    { data: likeRows },
    { data: candidateCovers },
    { data: viewerPreference },
    { data: follow },
    { data: viewerStates },
  ] = await Promise.all([
    getGamesByIds(items.map((item) => item.igdb_id)),
    supabase.rpc("get_content_likes", {
      target_type: "list",
      target_ids: [list.id],
    }),
    user && items.length
      ? supabase
          .from("user_games")
          .select("profile_id,igdb_id,custom_cover_url")
          .in("profile_id", [...new Set([user.id, list.profile_id])])
          .in(
            "igdb_id",
            items.map((item) => item.igdb_id),
          )
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("profiles")
          .select("custom_cover_scope")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", list.profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user && items.length
      ? supabase
          .from("user_games")
          .select(
            "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
          )
          .eq("profile_id", user.id)
          .in(
            "igdb_id",
            items.map((item) => item.igdb_id),
          )
      : Promise.resolve({ data: [] }),
  ]);
  const likeState = likeRows?.[0] as
    { like_count: number; liked_by_viewer: boolean } | undefined;
  const coverOwner =
    viewerPreference?.custom_cover_scope === "EVERYONE"
      ? list.profile_id
      : user?.id;
  const customById = new Map(
    (candidateCovers ?? [])
      .filter((cover) => cover.profile_id === coverOwner)
      .map((cover) => [cover.igdb_id, cover.custom_cover_url]),
  );
  const byId = new Map(
    games.map((game) => [
      game.id,
      {
        ...game,
        coverUrl: resolveGameCover(game.coverUrl, customById.get(game.id)),
      },
    ]),
  );
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const isRanked = Boolean(list.ranked);
  return (
    <main className="social-page">
      {user && <RecordView type="list" listId={list.id} />}
      <header className="list-detail-header">
        <h1>{list.name}</h1>
        <ListAuthor owner={owner} lang={lang} />
        {list.description && <p>{list.description}</p>}
        <div className="list-detail-meta">
          <span
            className="list-preview-mode"
            data-ranked={isRanked || undefined}
          >
            {isRanked ? (
              <ListOrdered size={13} aria-hidden />
            ) : (
              <Layers3 size={13} aria-hidden />
            )}
            {isRanked
              ? tri(lang, "Ranking", "Ranking", "Ranking")
              : tri(lang, "Coleção", "Collection", "Colección")}
          </span>
          <small>
            {items.length} {t.gamesLower}
          </small>
        </div>
        <div className="list-detail-social">
          <LikeButton
            contentType="list"
            contentId={list.id}
            count={Number(likeState?.like_count ?? 0)}
            liked={Boolean(likeState?.liked_by_viewer)}
            canLike={Boolean(user) && !isOwner}
            lang={lang}
          />
          <ShareButton
            className="content-share-action"
            title={list.name}
            text={
              pt
                ? `Lista de jogos por @${owner?.username} no uloggd`
                : `Game list by @${owner?.username} on uloggd`
            }
            label={t.share}
            copiedLabel={t.linkCopied}
            lang={lang}
          />
        </div>
        {isOwner && (
          <ListOwnerControls
            list={list}
            lang={lang}
            returnHref={`/${lang}/lists/${owner?.username}`}
          />
        )}
      </header>
      {isOwner && (
        <ListAddGame
          listId={list.id}
          existingIds={items.map((item) => item.igdb_id)}
          lang={lang}
        />
      )}
      {items.length ? (
        <ListItemsGrid
          listId={list.id}
          items={items
            .filter((item) => byId.has(item.igdb_id))
            .map((item) => ({
              id: item.id,
              igdbId: item.igdb_id,
              note: item.note,
            }))}
          games={Object.fromEntries(byId)}
          isOwner={isOwner}
          ranked={Boolean(list.ranked)}
          lang={lang}
          viewerEnabled={Boolean(user)}
          initialById={Object.fromEntries(
            (viewerStates ?? []).map((state) => [state.igdb_id, state]),
          )}
        />
      ) : (
        <div className="social-empty">
          <span aria-hidden>
            <Layers3 size={22} />
          </span>
          <h2>{tri(lang, "Lista vazia", "Empty list", "Lista vacía")}</h2>
          <p>
            {tri(
              lang,
              "Os jogos adicionados aparecerão aqui.",
              "Added games will appear here.",
              "Los juegos añadidos aparecerán aquí.",
            )}
          </p>
        </div>
      )}
      {/* Who can comment is a profile-wide preference now — the list dialog no
          longer carries a per-list override, so gating on the stored column
          would apply a rule the owner has no way to see or change. */}
      <ContentComments
        contentType="list"
        contentId={list.id}
        ownerId={list.profile_id}
        viewerId={user?.id ?? null}
        canComment={
          Boolean(user) &&
          (isOwner ||
            owner?.content_comment_scope === "EVERYONE" ||
            (owner?.content_comment_scope === "FOLLOWERS" && Boolean(follow)))
        }
        commentsScope={
          owner?.content_comment_scope as "EVERYONE" | "FOLLOWERS" | "NOBODY"
        }
        lang={lang}
      />
    </main>
  );
}
