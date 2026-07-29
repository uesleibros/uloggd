import { Gamepad2, Globe2, Layers3 } from "lucide-react";
import { redirect } from "next/navigation";
import { CreateListForm } from "@/components/social/create-list-form";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { ListsCollection } from "@/components/social/lists-collection";
import { getListPreviews, getListsCount } from "@/lib/lists";
import {
  LIST_PAGE_SIZE,
  type ListFilters,
  type ListSort,
  type ListVisibility,
} from "@/lib/lists-types";
import { getSupabase } from "@/lib/supabase/auth";
import { tri, uiText } from "@/lib/ui-text";

const VISIBILITIES = new Set<ListVisibility | "ALL">([
  "ALL",
  "PUBLIC",
  "FOLLOWERS",
  "PRIVATE",
]);
const MODES = new Set<NonNullable<ListFilters["mode"]>>([
  "ALL",
  "RANKED",
  "COLLECTION",
]);
const SORTS = new Set<ListSort>(["recent", "oldest", "name", "size", "likes"]);

export async function ListsWorkspacePage({
  lang,
  query,
  userId,
}: {
  lang: "pt-BR" | "en" | "es";
  query: Record<string, string | string[] | undefined>;
  userId: string;
}) {
  const supabase = await getSupabase();
  const user = { id: userId };

  // Filter defaults live here so both the query and the client hydration read
  // from the same source of truth. Anything outside the whitelist is coerced
  // to the safe default instead of leaking through Supabase.
  const rawVisibility =
    typeof query.visibility === "string"
      ? (query.visibility.toUpperCase() as ListVisibility | "ALL")
      : "ALL";
  const visibility = VISIBILITIES.has(rawVisibility) ? rawVisibility : "ALL";
  const rawMode =
    typeof query.mode === "string"
      ? (query.mode.toUpperCase() as NonNullable<ListFilters["mode"]>)
      : "ALL";
  const mode = MODES.has(rawMode) ? rawMode : "ALL";
  const rawSort =
    typeof query.sort === "string" ? (query.sort as ListSort) : "recent";
  const sort = SORTS.has(rawSort) ? rawSort : "recent";
  const searchQuery =
    typeof query.q === "string" ? query.q.trim().slice(0, 60) : "";

  const [
    lists,
    { data: profile },
    filteredCount,
    totalCount,
    publicCount,
    gamesCount,
  ] = await Promise.all([
    getListPreviews(supabase, {
      ownerId: user.id,
      viewerId: user.id,
      limit: LIST_PAGE_SIZE,
      visibility,
      mode,
      sort,
      query: searchQuery || undefined,
    }),
    supabase
      .from("profiles")
      .select("username,display_name,avatar_url,banner_url")
      .eq("id", user.id)
      .maybeSingle(),
    getListsCount(supabase, {
      ownerId: user.id,
      visibility,
      mode,
      query: searchQuery || undefined,
    }),
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
  const heroTotal = totalCount.count ?? 0;

  return (
    <main className="social-page lists-page workspace-layout-page">
      <WorkspaceHero
        profile={profile}
        title={t.lists}
        description={tri(
          lang,
          "Monte coleções por tema ou rankings quando a ordem importar.",
          "Build themed collections, or rankings when order matters.",
          "Arma colecciones por tema o rankings cuando el orden importe.",
        )}
        stats={[
          {
            icon: <Layers3 size={14} />,
            label: t.lists,
            value: heroTotal,
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
        {heroTotal === 0 ? (
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
                "Crie sua primeira coleção ou ranking para começar.",
                "Create your first collection or ranking to get started.",
                "Crea tu primera colección o ranking para comenzar.",
              )}
            </p>
          </div>
        ) : (
          <ListsCollection
            lang={lang}
            ownerId={user.id}
            initial={lists}
            total={filteredCount}
            grandTotal={heroTotal}
            pageSize={LIST_PAGE_SIZE}
            filters={{ visibility, mode, sort, q: searchQuery }}
          />
        )}
      </div>
    </main>
  );
}
