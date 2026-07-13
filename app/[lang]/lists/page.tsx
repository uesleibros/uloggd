import Link from "next/link";
import { List } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CreateListForm } from "@/components/social/create-list-form";
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
    .select("id,name,description,visibility,updated_at,game_list_items(count)")
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });
  const pt = lang === "pt-BR";
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
            const count = Array.isArray(list.game_list_items)
              ? (list.game_list_items[0]?.count ?? 0)
              : 0;
            return (
              <Link href={`/${lang}/lists/${list.id}`} key={list.id}>
                <span>
                  {list.visibility === "PRIVATE"
                    ? pt
                      ? "PRIVADA"
                      : "PRIVATE"
                    : list.visibility === "FOLLOWERS"
                      ? pt
                        ? "SEGUIDORES"
                        : "FOLLOWERS"
                      : pt
                        ? "PÚBLICA"
                        : "PUBLIC"}
                </span>
                <h2>{list.name}</h2>
                <p>
                  {list.description ||
                    (pt ? "Sem descrição." : "No description.")}
                </p>
                <small>
                  {count} {pt ? "jogos" : "games"}
                </small>
              </Link>
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
