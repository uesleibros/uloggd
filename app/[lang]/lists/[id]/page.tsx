import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { LikeButton } from "@/components/social/like-button";
import { ShareButton } from "@/components/share-button";
import { ListAddGame } from "@/components/social/list-add-game";
import { ListItemTools } from "@/components/social/list-item-tools";
import {
  ListOwnerControls,
  RemoveListItem,
} from "@/components/social/list-owner-controls";
import { getGamesByIds } from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";

type Props = PageProps<"/[lang]/lists/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[0-9a-f-]{36}$/i.test(id)) return {};
  const { data: list } = await (
    await getSupabase()
  )
    .from("game_lists")
    .select("name,description,profiles!game_lists_profile_id_fkey(username)")
    .eq("id", id)
    .maybeSingle();
  if (!list) return {};
  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const description =
    list.description ||
    (lang === "pt-BR"
      ? `Uma lista de jogos criada por @${owner?.username} no uloggd.`
      : `A game list by @${owner?.username} on uloggd.`);
  return {
    title: list.name,
    description,
    openGraph: {
      title: `${list.name} · uloggd`,
      description,
      type: "website",
      siteName: "uloggd",
    },
    twitter: { card: "summary", title: `${list.name} · uloggd`, description },
  };
}

export default async function ListPage({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await getSupabase();
  const [{ data: list }, user] = await Promise.all([
    supabase
      .from("game_lists")
      .select(
        "id,profile_id,name,description,visibility,profiles!game_lists_profile_id_fkey(username,display_name),game_list_items(id,igdb_id,game_slug,position,note)",
      )
      .eq("id", id)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!list) notFound();
  const items = [...(list.game_list_items ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const [games, { data: likeRows }] = await Promise.all([
    getGamesByIds(items.map((item) => item.igdb_id)),
    supabase.rpc("get_content_likes", {
      target_type: "list",
      target_ids: [list.id],
    }),
  ]);
  const likeState = likeRows?.[0] as
    | { like_count: number; liked_by_viewer: boolean }
    | undefined;
  const byId = new Map(games.map((game) => [game.id, game]));
  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const pt = lang === "pt-BR";
  const isOwner = user?.id === list.profile_id;
  return (
    <main className="social-page">
      <header className="list-detail-header">
        <span>
          {pt ? "LISTA DE" : "LIST BY"} @{owner?.username}
        </span>
        <h1>{list.name}</h1>
        {list.description && <p>{list.description}</p>}
        <small>
          {items.length} {pt ? "jogos" : "games"}
        </small>
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
            label={pt ? "Compartilhar" : "Share"}
            copiedLabel={pt ? "Link copiado" : "Link copied"}
            lang={lang}
          />
        </div>
        {isOwner && <ListOwnerControls list={list} lang={lang} />}
      </header>
      {isOwner && (
        <ListAddGame
          listId={list.id}
          existingIds={items.map((item) => item.igdb_id)}
          lang={lang}
        />
      )}
      {items.length ? (
        <div className="library-grid">
          {items.map((item, index) => {
            const game = byId.get(item.igdb_id);
            return game ? (
              <div className="ranked-list-item" key={item.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <QuickGameCard
                  game={game}
                  initial={null}
                  lang={lang}
                  enabled={false}
                />
                {item.note && <p>{item.note}</p>}
                {isOwner && (
                  <div className="list-item-owner-tools">
                    <ListItemTools
                      listId={list.id}
                      itemId={item.id}
                      note={item.note}
                      first={index === 0}
                      last={index === items.length - 1}
                      lang={lang}
                    />
                    <RemoveListItem
                      listId={list.id}
                      gameId={item.igdb_id}
                      lang={lang}
                    />
                  </div>
                )}
              </div>
            ) : null;
          })}
        </div>
      ) : (
        <div className="social-empty">
          <h2>{pt ? "Lista vazia" : "Empty list"}</h2>
          <p>
            {pt
              ? "Os jogos adicionados aparecerão aqui."
              : "Added games will appear here."}
          </p>
        </div>
      )}
    </main>
  );
}
