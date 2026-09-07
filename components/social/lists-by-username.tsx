import Link from "next/link";
import { ArrowLeft, Gamepad2, Layers3 } from "lucide-react";
import { notFound } from "next/navigation";
import { ListsWorkspacePage } from "./lists-owner-workspace";
import { serverApi } from "@/lib/api-server";
import { getPublicProfile } from "@/lib/profiles";
import type { ProfileLists } from "@/lib/lists-types";
import { getAuthUser } from "@/lib/supabase/auth";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { ListPreviewCard } from "./list-preview-card";
import { LoadMoreLists } from "./load-more-lists";
import { WorkspaceHero } from "./workspace-hero";

const PAGE_SIZE = 24;

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

  const result = await serverApi.get<ProfileLists>(
    `/profiles/${encodeURIComponent(username)}/lists?visibility=PUBLIC&limit=${PAGE_SIZE}`,
  );
  const lists = result.data;
  const total = result.matching;
  const gamesCount = { count: result.games };
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
          { icon: <Layers3 size={14} />, label: t.lists, value: total },
          {
            icon: <Gamepad2 size={14} />,
            label: t.games,
            value: gamesCount.count ?? 0,
          },
        ]}
      />
      <div className="workspace-page-body">
        <Link
          className="page-back-link"
          href={`/${lang}/u/${profile.username}`}
        >
          <ArrowLeft size={15} /> {t.backToProfile}
        </Link>
        {lists.length ? (
          <>
            <div className="lists-row">
              {lists.map((list) => (
                <ListPreviewCard
                  key={list.id}
                  list={list}
                  covers={list.covers}
                  tierRows={list.tierRows}
                  lang={lang}
                  likes={list.likes}
                  comments={list.comments}
                />
              ))}
            </div>
            <LoadMoreLists
              lang={lang}
              ownerId={profile.id}
              gridClassName="lists-row"
              pageSize={PAGE_SIZE}
              initialCursor={
                lists.length ? lists[lists.length - 1].updatedAt : null
              }
              hasMore={lists.length === PAGE_SIZE}
            />
          </>
        ) : (
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
        )}
      </div>
    </main>
  );
}
