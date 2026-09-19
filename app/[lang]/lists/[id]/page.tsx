import { getList } from "@/lib/content";
import { serverApi } from "@/lib/api-server";
import type { TierlistResponse } from "@/lib/content-types";
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
import { getLibraryPool } from "@/lib/library-pool";
import { ListItemsGrid } from "@/components/social/list-items-grid";
import { ListOwnerControls } from "@/components/social/list-owner-controls";
import { ListViewMode } from "@/components/social/list-view-mode";
import { ListReport } from "@/components/social/list-report";
import { ListsByUsername } from "@/components/social/lists-by-username";
import {
  TierlistBoard,
  TierlistSkeleton,
} from "@/components/social/tierlist-board";
import { TierlistEditor } from "@/components/social/tierlist-editor";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { ContentComments } from "@/components/social/content-comments";
import { VerifiedBadge } from "@/components/verified-badge";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import type { ProfileLevel } from "@/lib/profile-level";
import { jsonLd, socialMetadata, SITE_URL } from "@/lib/seo";
import { getAuthUser } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { contentKey } from "@/lib/public-id";

type Props = PageProps<"/[lang]/lists/[id]">;

function ListAuthor({
  owner,
  lang,
  standing,
  ownerId,
}: {
  owner: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  } | null;
  lang: UiLang;
  standing?: ProfileLevel | null;
  ownerId: string;
}) {
  if (!owner?.username) return null;
  return (
    <span className="list-detail-author">
      <Link href={`/${lang}/u/${owner.username}`}>
        <span>
          {owner.avatar_url ? (
            <Image
              src={owner.avatar_url}
              alt=""
              fill
              sizes="28px"
              unoptimized
            />
          ) : (
            owner.username.slice(0, 1).toUpperCase()
          )}
        </span>
        <small>
          {tri(lang, "por", "by", "por")}{" "}
          {owner.display_name || `@${owner.username}`}
        </small>
      </Link>
      {/* Siblings of the link: the level badge is a button. */}
      {standing && <ProfileLevelBadge lang={lang} standing={standing} />}
      {owner.verified && <VerifiedBadge lang={lang} profileId={ownerId} />}
    </span>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang)) return {};
  const profileTitle = tri(
    lang,
    `Listas de @${id}`,
    `@${id}'s lists`,
    `Listas de @${id}`,
  );
  const profileDescription = tri(
    lang,
    `Coleções e tierlists publicadas por @${id}.`,
    `Collections and tier lists published by @${id}.`,
    `Colecciones y tierlists publicadas por @${id}.`,
  );
  const profileMetadata = {
    title: profileTitle,
    description: profileDescription,
    ...socialMetadata({
      lang,
      path: `/lists/${id}`,
      title: profileTitle,
      description: profileDescription,
      type: "profile",
      image: null,
      largeImage: true,
    }),
  } satisfies Metadata;
  const key = contentKey(id);
  if (!key) return profileMetadata;
  const list = (await getList(id))?.data;
  if (!list) return profileMetadata;
  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const description =
    list.description ||
    (list.kind === "TIERLIST"
      ? tri(
          lang,
          `Uma tierlist de jogos criada por @${owner?.username} no uloggd.`,
          `A game tier list by @${owner?.username} on uloggd.`,
          `Una tierlist de juegos creada por @${owner?.username} en uloggd.`,
        )
      : tri(
          lang,
          `Uma lista de jogos criada por @${owner?.username} no uloggd.`,
          `A game list by @${owner?.username} on uloggd.`,
          `Una lista de juegos creada por @${owner?.username} en uloggd.`,
        ));
  return {
    title: list.name,
    description,
    // Always the short id, never the uuid form of the same list, two URLs for
    // one page is exactly what a canonical exists to collapse.
    ...socialMetadata({
      lang,
      path: `/lists/${list.public_id}`,
      title: list.name,
      description,
      image: null,
      largeImage: true,
    }),
  };
}

// Streamed under Suspense: the tier API hydrates IGDB covers, the slow
// part of the page. The header renders first, this fills in behind the tier
// skeleton. Owners choose the same read-only board visitors see or the full
// editor; empty boards keep their explicit empty state in view mode.
async function TierlistBody({
  listId,
  isOwner,
  isEditing,
  lang,
}: {
  listId: string;
  ownerId: string;
  isOwner: boolean;
  isEditing: boolean;
  lang: UiLang;
}) {
  const { data: tierlist } = await serverApi.get<TierlistResponse>(
    `/lists/${listId}/tiers?pool=${isOwner && isEditing ? 1 : 0}`,
  );
  if (isOwner && isEditing)
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

type ListResponse = NonNullable<Awaited<ReturnType<typeof getList>>>;
type ListData = NonNullable<ListResponse["data"]>;
type ListItem = NonNullable<ListData["items"]>[number];

/** The cover grid loading.tsx draws, so the wait looks the same throughout. */
function CollectionSkeleton() {
  return (
    <div
      className="skeleton-cover-grid list-detail-loading-grid"
      aria-busy="true"
      aria-hidden="true"
    >
      {Array.from({ length: 10 }, (_, index) => (
        <span className="skeleton-block" key={index} />
      ))}
    </div>
  );
}

/**
 * The games of a collection, streamed under the header.
 *
 * Every game in the list is looked up on IGDB for its cover and name, and the
 * header used to wait for all of them: three seconds before the title of a
 * long list appeared. The title, author and counts are already in the list
 * itself, so they go out first and the grid follows.
 */
async function CollectionBody({
  list,
  items,
  ownerName,
  ownerUsername,
  coverOwner,
  covers,
  viewerStates,
  editable,
  viewerEnabled,
  lang,
}: {
  list: ListData;
  items: ListItem[];
  ownerName: string;
  ownerUsername: string | undefined;
  coverOwner: string | undefined;
  covers: ListResponse["context"]["covers"];
  viewerStates: ListResponse["viewer_states"];
  editable: boolean;
  viewerEnabled: boolean;
  lang: UiLang;
}) {
  const games = await getGamesByIds(items.map((item) => item.igdb_id));
  const customById = new Map(
    (covers ?? [])
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
  const isRanked = Boolean(list.ranked);
  return (
    <>
      {/* A public list is an ordered set of named things, which is exactly what
          ItemList describes. Private and followers-only lists are left out:
          handing a crawler the contents is publishing them, whatever the page
          does afterwards. */}
      {list.visibility === "PUBLIC" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "@id": `${SITE_URL}/${lang}/lists/${list.public_id}`,
            url: `${SITE_URL}/${lang}/lists/${list.public_id}`,
            name: list.name,
            description: list.description ?? undefined,
            numberOfItems: items.length,
            itemListOrder: isRanked
              ? "https://schema.org/ItemListOrderDescending"
              : "https://schema.org/ItemListUnordered",
            author: {
              "@type": "Person",
              name: ownerName,
              url: `${SITE_URL}/${lang}/u/${ownerUsername}`,
            },
            // Capped: a list of several hundred games would put more markup on
            // the page than content, and crawlers truncate it regardless.
            itemListElement: items.slice(0, 50).map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "VideoGame",
                name: byId.get(item.igdb_id)?.name ?? item.game_slug,
                url: `${SITE_URL}/${lang}/game/${item.game_slug}`,
              },
            })),
          })}
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
          isOwner={editable}
          ranked={Boolean(list.ranked)}
          lang={lang}
          viewerEnabled={viewerEnabled}
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
    </>
  );
}

export default async function ListPage({ params, searchParams }: Props) {
  const [{ lang, id }, query] = await Promise.all([params, searchParams]);
  const key = contentKey(id);
  if (!hasLocale(lang)) notFound();
  if (!key) return <ListsByUsername lang={lang} username={id} query={query} />;
  const [response, user] = await Promise.all([getList(id), getAuthUser()]);
  const list = response?.data;
  if (!response || !list)
    return <ListsByUsername lang={lang} username={id} query={query} />;
  if (key[0] === "id") permanentRedirect(`/${lang}/lists/${list.public_id}`);

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const isOwner = user?.id === list.profile_id;
  const isEditing = isOwner && query.edit === "1";
  const listHref = `/${lang}/lists/${list.public_id}`;
  const { context } = response;
  const standing = context.standing;

  if (list.kind === "TIERLIST") {
    const t = uiText(lang);
    const likeState = context.like;
    const follow = context.viewer_follows;
    const rankedCount = response.live_ids.length;
    return (
      <main className="social-page">
        {user && <RecordView type="list" listId={list.id} />}
        <header className="list-detail-header">
          <h1>{list.name}</h1>
          <ListAuthor
            owner={owner}
            lang={lang}
            standing={standing}
            ownerId={list.profile_id}
          />
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
              canLike={Boolean(user)}
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
                ownerUsername={owner.username}
                lang={lang}
              />
            )}
          </div>
          {isOwner && (
            <div className="list-detail-owner-workspace">
              <ListViewMode href={listHref} editing={isEditing} lang={lang} />
              {isEditing && (
                <ListOwnerControls
                  list={list}
                  lang={lang}
                  returnHref={`/${lang}/lists/${owner?.username}`}
                />
              )}
            </div>
          )}
        </header>
        <Suspense fallback={<TierlistSkeleton />}>
          <TierlistBody
            listId={list.id}
            ownerId={list.profile_id}
            isOwner={isOwner}
            isEditing={isEditing}
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

  const items = [...(list.items ?? [])].sort((a, b) => a.position - b.position);
  // Only the owner's editor needs this before the header can be drawn.
  const libraryPool = isEditing
    ? await getLibraryPool(items.map((item) => item.igdb_id))
    : [];
  const likeState = context.like;
  const follow = context.viewer_follows;
  const coverOwner =
    context.custom_cover_scope === "EVERYONE" ? list.profile_id : user?.id;
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const isRanked = Boolean(list.ranked);
  return (
    <main className="social-page">
      {user && <RecordView type="list" listId={list.id} />}
      <header className="list-detail-header">
        <h1>{list.name}</h1>
        <ListAuthor
          owner={owner}
          lang={lang}
          standing={standing}
          ownerId={list.profile_id}
        />
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
            canLike={Boolean(user)}
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
          <div className="list-detail-owner-workspace">
            <ListViewMode href={listHref} editing={isEditing} lang={lang} />
            {isEditing && (
              <div className="list-detail-owner-row">
                <ListAddGame
                  listId={list.id}
                  pool={libraryPool}
                  inListIds={items.map((item) => item.igdb_id)}
                  lang={lang}
                />
                <ListOwnerControls
                  list={list}
                  lang={lang}
                  returnHref={`/${lang}/lists/${owner?.username}`}
                />
              </div>
            )}
          </div>
        )}
      </header>
      <Suspense fallback={<CollectionSkeleton />}>
        <CollectionBody
          list={list}
          items={items}
          ownerName={owner?.display_name || `@${owner?.username}`}
          ownerUsername={owner?.username}
          coverOwner={coverOwner}
          covers={context.covers ?? []}
          viewerStates={response.viewer_states ?? []}
          editable={isOwner && isEditing}
          viewerEnabled={Boolean(user)}
          lang={lang}
        />
      </Suspense>
      {/* Who can comment is a profile-wide preference now, the list dialog no
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
