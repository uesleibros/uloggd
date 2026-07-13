import { List } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CreateListForm } from "@/components/social/create-list-form";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../dictionaries";

export default async function ListsPage({
  params,
}: PageProps<"/[lang]/lists">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/lists`);
  const { data: lists } = await supabase
    .from("game_lists")
    .select(
      "id,name,description,visibility,updated_at,game_list_items(igdb_id,position)",
    )
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });
  const pt = lang === "pt-BR";
  const itemIds = (lists ?? []).flatMap((list) =>
    list.game_list_items.map((item) => item.igdb_id),
  );
  const [games, { data: savedCovers }] = await Promise.all([
    getGamesByIds(itemIds),
    itemIds.length
      ? supabase
          .from("user_games")
          .select("igdb_id,custom_cover_url")
          .eq("profile_id", user.id)
          .in("igdb_id", itemIds)
      : Promise.resolve({ data: [] }),
  ]);
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const customById = new Map(
    (savedCovers ?? []).map((item) => [item.igdb_id, item.custom_cover_url]),
  );
  return (
    <main className="social-page">
      <header className="social-page-header social-page-header-actions">
        <div>
          <span>
            <List size={14} /> {pt ? "COLEÇÕES CURADAS" : "CURATED COLLECTIONS"}
          </span>
          <h1>{pt ? "Suas listas" : "Your lists"}</h1>
          <p>
            {pt
              ? "Agrupe jogos por tema, ranking ou pelo motivo que quiser."
              : "Group games by theme, ranking, or any reason you like."}
          </p>
        </div>
        <CreateListForm lang={lang} />
      </header>
      {lists?.length ? (
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
              />
            );
          })}
        </div>
      ) : (
        <div className="social-empty">
          <h2>{pt ? "Nenhuma lista ainda" : "No lists yet"}</h2>
          <p>
            {pt
              ? "Crie sua primeira coleção e adicione jogos pelas páginas deles."
              : "Create your first collection and add games from their pages."}
          </p>
        </div>
      )}
    </main>
  );
}
