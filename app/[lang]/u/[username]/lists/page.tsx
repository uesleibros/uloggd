import type { Metadata } from "next";
import { ArrowLeft, Layers3, List } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { resolveGameCover } from "@/lib/game-cover";
import { getGamesByIds } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { hasLocale } from "../../../dictionaries";
import "../../../profile.css";

type Props = { params: Promise<{ lang: string; username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  return {
    title: lang === "pt-BR" ? `Listas de @${username}` : `@${username}'s lists`,
  };
}

export default async function ProfileListsPage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const [{ data: profile }, user] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,username,display_name")
      .ilike("username", username)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!profile?.username) notFound();

  const { data: lists } = await supabase
    .from("game_lists")
    .select(
      "id,name,description,visibility,updated_at,game_list_items(igdb_id,position)",
    )
    .eq("profile_id", profile.id)
    .eq("visibility", "PUBLIC")
    .order("updated_at", { ascending: false });
  const itemIds = (lists ?? []).flatMap((list) =>
    list.game_list_items.map((item) => item.igdb_id),
  );
  const [
    games,
    { data: savedCovers },
    { data: likeRows },
    { data: viewerPreference },
  ] = await Promise.all([
    getGamesByIds(itemIds),
    itemIds.length
      ? supabase
          .from("user_games")
          .select("igdb_id,custom_cover_url")
          .eq("profile_id", profile.id)
          .in("igdb_id", itemIds)
      : Promise.resolve({ data: [] }),
    lists?.length
      ? supabase.rpc("get_content_likes", {
          target_type: "list",
          target_ids: lists.map((list) => list.id),
        })
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("profiles")
          .select("custom_cover_scope")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const showCreatorCovers =
    user?.id === profile.id ||
    viewerPreference?.custom_cover_scope === "EVERYONE";
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const customById = new Map(
    (savedCovers ?? []).map((item) => [
      item.igdb_id,
      showCreatorCovers ? item.custom_cover_url : null,
    ]),
  );
  const likesById = new Map(
    ((likeRows ?? []) as { content_id: string; like_count: number }[]).map(
      (row) => [row.content_id, Number(row.like_count)],
    ),
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
          <List size={14} /> {pt ? "COLEÇÕES PÚBLICAS" : "PUBLIC COLLECTIONS"}
        </span>
        <h1>{pt ? `Listas de ${name}` : `${name}'s lists`}</h1>
        <p>
          {pt
            ? "Seleções organizadas por tema, ranking ou uma ideia em comum."
            : "Selections organized by theme, ranking, or a shared idea."}
        </p>
      </header>
      {lists?.length ? (
        <div className="lists-grid profile-lists-grid">
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
      ) : (
        <div className="social-empty profile-subpage-empty">
          <Layers3 size={24} />
          <h2>{pt ? "Nenhuma lista visível" : "No visible lists"}</h2>
          <p>
            {pt
              ? "Este usuário ainda não publicou nenhuma coleção."
              : "This user has not published any collections yet."}
          </p>
        </div>
      )}
    </main>
  );
}
