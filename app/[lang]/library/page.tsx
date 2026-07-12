import { notFound, redirect } from "next/navigation";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { getGamesByIds } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../dictionaries";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/library`);

  const { data: records } = await supabase
    .from("user_games")
    .select(
      "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
    )
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });
  const games = await getGamesByIds(
    (records ?? []).map((record) => record.igdb_id),
  );
  const byId = new Map(games.map((game) => [game.id, game]));

  return (
    <main className="library-page">
      <header>
        <span>{lang === "pt-BR" ? "Sua coleção" : "Your collection"}</span>
        <h1>{lang === "pt-BR" ? "Biblioteca" : "Library"}</h1>
        <p>
          {lang === "pt-BR"
            ? "Passe sobre uma capa para atualizar status, nota ou escolher outra imagem."
            : "Hover over a cover to update status, rating, or choose another image."}
        </p>
      </header>
      {records?.length ? (
        <div className="library-grid">
          {records.map((record) => {
            const game = byId.get(record.igdb_id);
            return game ? (
              <QuickGameCard
                key={game.id}
                game={game}
                initial={record}
                lang={lang}
              />
            ) : null;
          })}
        </div>
      ) : (
        <section className="library-empty">
          <h2>
            {lang === "pt-BR"
              ? "Sua biblioteca está vazia"
              : "Your library is empty"}
          </h2>
          <p>
            {lang === "pt-BR"
              ? "Use as ações rápidas nas capas da página inicial para começar."
              : "Use the quick actions on home page covers to get started."}
          </p>
        </section>
      )}
    </main>
  );
}
