import { Gamepad2, Globe2, Layers3, List } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CreateListForm } from "@/components/social/create-list-form";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { LoadMoreLists } from "@/components/social/load-more-lists";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { getListPreviews } from "@/lib/lists";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";

const PAGE_SIZE = 24;

export default async function ListsPage({
  params,
}: PageProps<"/[lang]/lists">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/lists`);
  const [lists, { data: profile }, listsCount, publicCount, gamesCount] =
    await Promise.all([
      getListPreviews(supabase, {
        ownerId: user.id,
        viewerId: user.id,
        limit: PAGE_SIZE,
      }),
      supabase
        .from("profiles")
        .select("username,display_name,avatar_url,banner_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("game_lists")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id),
      supabase
        .from("game_lists")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("visibility", "PUBLIC"),
      supabase
        .from("game_list_items")
        .select("igdb_id,game_lists!inner(profile_id)", {
          count: "exact",
          head: true,
        })
        .eq("game_lists.profile_id", user.id),
    ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  const pt = lang === "pt-BR";
  const totalLists = listsCount.count ?? lists.length;

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
            value: gamesCount.count ?? 0,
          },
          {
            icon: <Globe2 size={14} />,
            label: pt ? "Públicas" : "Public",
            value: publicCount.count ?? 0,
          },
        ]}
      >
        <CreateListForm lang={lang} />
      </WorkspaceHero>
      <div className="workspace-page-body">
        {lists.length ? (
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
            <div className="lists-row">
              {lists.map((list) => (
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
              ))}
            </div>
            <LoadMoreLists
              lang={lang}
              ownerId={user.id}
              pageSize={PAGE_SIZE}
              initialCursor={
                lists.length ? lists[lists.length - 1].updatedAt : null
              }
              hasMore={lists.length === PAGE_SIZE}
            />
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
