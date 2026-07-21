import { Gamepad2, Globe2, Layers3, List } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CreateListForm } from "@/components/social/create-list-form";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { ListsCollection } from "@/components/social/lists-collection";
import { getListPreviews } from "@/lib/lists";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import { tri, uiText } from "@/lib/ui-text";

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
  const t = uiText(lang);
  const totalLists = listsCount.count ?? lists.length;

  return (
    <main className="social-page lists-page workspace-layout-page">
      <WorkspaceHero
        profile={profile}
        eyebrow={
          <>
            <List size={14} />{" "}
            {tri(
              lang,
              "ORGANIZE DO SEU JEITO",
              "ORGANIZE YOUR WAY",
              "ORGANIZA A TU MANERA",
            )}
          </>
        }
        title={t.lists}
        description={tri(
          lang,
          "Monte seleções por tema, ranking ou qualquer ideia que conecte seus jogos.",
          "Build selections by theme, ranking, or any idea that connects your games.",
          "Arma selecciones por tema, ranking o cualquier idea que conecte tus juegos.",
        )}
        stats={[
          {
            icon: <Layers3 size={14} />,
            label: t.lists,
            value: totalLists,
          },
          {
            icon: <Gamepad2 size={14} />,
            label: t.games,
            value: gamesCount.count ?? 0,
          },
          {
            icon: <Globe2 size={14} />,
            label: tri(lang, "Públicas", "Public", "Públicas"),
            value: publicCount.count ?? 0,
          },
        ]}
      >
        <CreateListForm lang={lang} />
      </WorkspaceHero>
      <div className="workspace-page-body">
        {lists.length ? (
          <ListsCollection
            lang={lang}
            ownerId={user.id}
            initial={lists}
            total={totalLists}
            pageSize={PAGE_SIZE}
            hasMore={lists.length === PAGE_SIZE}
          />
        ) : (
          <div className="social-empty lists-empty">
            <span>
              <Layers3 size={22} />
            </span>
            <h2>
              {tri(
                lang,
                "Nenhuma lista ainda",
                "No lists yet",
                "Todavía sin listas",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Crie sua primeira coleção e adicione jogos pelas páginas deles.",
                "Create your first collection and add games from their pages.",
                "Crea tu primera colección y añade juegos desde sus páginas.",
              )}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
