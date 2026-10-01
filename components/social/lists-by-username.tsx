import Link from "next/link";
import { ArrowLeft, Gamepad2, Layers3 } from "lucide-react";
import { notFound } from "next/navigation";
import { ListsWorkspacePage } from "./lists-owner-workspace";
import { serverApi } from "@/lib/api-server";
import { getPublicProfile } from "@/lib/profiles";
import type { ListFolder, ProfileLists } from "@/lib/lists-types";
import {
  LIST_PAGE_SIZE,
  type ListFilters,
  type ListSort,
} from "@/lib/lists-types";
import { getAuthUser } from "@/lib/supabase/auth";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { ListsCollection } from "./lists-collection";
import { WorkspaceHero } from "./workspace-hero";

const MODES = new Set<NonNullable<ListFilters["mode"]>>([
  "ALL",
  "RANKED",
  "COLLECTION",
  "TIERLIST",
]);
const SORTS = new Set<ListSort>(["recent", "oldest", "name", "size", "likes"]);

/**
 * Somebody else's lists.
 *
 * The same page the owner gets, minus what only an owner can do. It used to
 * be a different page entirely: a bare grid with a "load more" under it, no
 * search, no sort, and no way to ask for only the rankings, on exactly the
 * lists the owner could do all three to. The person who had never seen them
 * before was the one given the fewest ways to find anything.
 *
 * Visibility is enforced by row policies, including lists shared with followers.
 */
export async function ListsByUsername({
  lang,
  username,
  query,
}: {
  lang: UiLang;
  username: string;
  query: Record<string, string | string[] | undefined>;
}) {
  const [response, viewer] = await Promise.all([
    getPublicProfile(username),
    getAuthUser(),
  ]);
  const profile = response?.data;
  if (!profile?.username) notFound();
  const viewerId = viewer?.id ?? null;
  if (viewerId && viewerId === profile.id)
    return (
      <ListsWorkspacePage
        profile={profile}
        lang={lang}
        query={query}
        userId={viewerId}
      />
    );

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
  const rawFolder = typeof query.folder === "string" ? query.folder : "";
  const folder =
    rawFolder === "NONE" || /^[0-9A-Za-z]{8,24}$/.test(rawFolder)
      ? rawFolder
      : "";

  const filters = new URLSearchParams({
    visibility: "ALL",
    mode,
    sort,
    q: searchQuery,
    limit: String(LIST_PAGE_SIZE),
  });
  if (folder) filters.set("folder", folder);
  const [result, folders] = await Promise.all([
    serverApi.get<ProfileLists>(
      `/profiles/${encodeURIComponent(username)}/lists?${filters}`,
    ),
    serverApi.get<{ data: ListFolder[]; unfiled: number }>(
      `/profiles/${encodeURIComponent(username)}/lists/folders`,
    ),
  ]);
  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <main className="social-page lists-page workspace-layout-page">
      <WorkspaceHero
        profile={profile}
        title={tri(
          lang,
          `Listas de ${name}`,
          `${name}'s lists`,
          `Listas de ${name}`,
        )}
        description={tri(
          lang,
          `Coleções, rankings e tierlists publicados por @${profile.username}.`,
          `Collections, rankings, and tier lists published by @${profile.username}.`,
          `Colecciones, rankings y tierlists publicados por @${profile.username}.`,
        )}
        stats={[
          { icon: <Layers3 size={14} />, label: t.lists, value: result.total },
          {
            icon: <Gamepad2 size={14} />,
            label: t.games,
            value: result.games ?? 0,
          },
        ]}
      />
      <div className="workspace-page-body">
        <Link
          prefetch={false}
          className="page-back-link"
          href={`/${lang}/u/${profile.username}`}
        >
          <ArrowLeft size={15} /> {t.backToProfile}
        </Link>
        {result.total === 0 ? (
          <div className="social-empty lists-empty">
            <span aria-hidden>
              <Layers3 size={22} />
            </span>
            <h2>
              {tri(
                lang,
                "Nenhuma lista visível",
                "No visible lists",
                "Ninguna lista visible",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Este usuário ainda não publicou nenhuma coleção.",
                "This user has not published any collections yet.",
                "Este usuario todavía no ha publicado ninguna colección.",
              )}
            </p>
          </div>
        ) : (
          <ListsCollection
            lang={lang}
            ownerId={profile.id}
            owner={false}
            // Not the hero's title again: it is already the largest thing
            // on the page, a hand's width above this.
            heading={t.lists}
            initial={result.data}
            total={result.matching}
            grandTotal={result.total}
            pageSize={LIST_PAGE_SIZE}
            folders={folders.data}
            unfiled={folders.unfiled}
            filters={{
              visibility: "ALL",
              mode,
              sort,
              q: searchQuery,
              folder,
            }}
          />
        )}
      </div>
    </main>
  );
}
