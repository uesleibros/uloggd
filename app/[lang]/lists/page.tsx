import { Gamepad2, Globe2, Layers3, List } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CreateListForm } from "@/components/social/create-list-form";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";

export default async function ListsPage({
  params,
}: PageProps<"/[lang]/lists">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/lists`);
  const [{ data: lists }, { data: profile }] = await Promise.all([
    supabase
      .from("game_lists")
      .select(
        "id,name,description,visibility,updated_at,game_list_items(igdb_id,position)",
      )
      .eq("profile_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("username,display_name,avatar_url,banner_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  const pt = lang === "pt-BR";
  const itemIds = (lists ?? []).flatMap((list) =>
    list.game_list_items.map((item) => item.igdb_id),
  );
  const [games, { data: savedCovers }, { data: likeRows }] = await Promise.all([
    getGamesByIds(itemIds),
    itemIds.length
      ? supabase
          .from("user_games")
          .select("igdb_id,custom_cover_url")
          .eq("profile_id", user.id)
          .in("igdb_id", itemIds)
      : Promise.resolve({ data: [] }),
    lists?.length
      ? supabase.rpc("get_content_likes", {
          target_type: "list",
          target_ids: lists.map((list) => list.id),
        })
      : Promise.resolve({ data: [] }),
  ]);
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const customById = new Map(
    (savedCovers ?? []).map((item) => [item.igdb_id, item.custom_cover_url]),
  );
  const likesById = new Map(
    ((likeRows ?? []) as { content_id: string; like_count: number }[]).map(
      (row) => [row.content_id, Number(row.like_count)],
    ),
  );
  const totalLists = lists?.length ?? 0;
  const publicLists =
    lists?.filter((list) => list.visibility === "PUBLIC").length ?? 0;

  return (
    <main className="social-page lists-page workspace-layout-page">
      <WorkspaceHero
        profile={profile}
        eyebrow={
          <>
            <List size={14} />{" "}
            {pt ? "ORGANIZE DO SEU JEITO" : "ORGANIZE YOUR WAY"}
          </>
        }
        title={pt ? "Listas" : "Lists"}
        description={
          pt
            ? "Monte seleções por tema, ranking ou qualquer ideia que conecte seus jogos."
            : "Build selections by theme, ranking, or any idea that connects your games."
        }
        stats={[
          {
            icon: <Layers3 size={14} />,
            label: pt ? "Listas" : "Lists",
            value: totalLists,
          },
          {
            icon: <Gamepad2 size={14} />,
            label: pt ? "Jogos" : "Games",
            value: itemIds.length,
          },
          {
            icon: <Globe2 size={14} />,
            label: pt ? "Públicas" : "Public",
            value: publicLists,
          },
        ]}
      >
        <CreateListForm lang={lang} />
      </WorkspaceHero>
      <div className="workspace-page-body">
        {lists?.length ? (
          <section className="lists-collection">
            <header>
              <div>
                <h2>{pt ? "Todas as listas" : "All lists"}</h2>
                <p>
                  {pt
                    ? "Atualizadas recentemente primeiro"
                    : "Recently updated first"}
                </p>
              </div>
              <span>{totalLists}</span>
            </header>
            <div className="lists-grid">
              {lists.map((list) => {
                const items = [...list.game_list_items].sort(
                  (a, b) => a.position - b.position,
                );
                const covers = items.slice(0, 5).flatMap((item) => {
                  const game = gamesById.get(item.igdb_id);
                  return game
                    ? [
                        {
                          url: resolveGameCover(
                            game.coverUrl,
                            customById.get(game.id),
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
                    likes={likesById.get(list.id) ?? 0}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <div className="social-empty lists-empty">
            <span>
              <Layers3 size={22} />
            </span>
            <h2>{pt ? "Nenhuma lista ainda" : "No lists yet"}</h2>
            <p>
              {pt
                ? "Crie sua primeira coleção e adicione jogos pelas páginas deles."
                : "Create your first collection and add games from their pages."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
