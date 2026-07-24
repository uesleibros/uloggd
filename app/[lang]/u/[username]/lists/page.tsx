import type { Metadata } from "next";
import { ArrowLeft, Layers3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { LoadMoreLists } from "@/components/social/load-more-lists";
import { getListPreviews } from "@/lib/lists";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { hasLocale, resolveLocale } from "../../../dictionaries";
import "../../../profile.css";
import { tri, uiText } from "@/lib/ui-text";

type Props = { params: Promise<{ lang: string; username: string }> };

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, username } = await params;
  const lang = resolveLocale(rawLang);
  return {
    title: tri(
      lang,
      `Listas de @${username}`,
      `@${username}'s lists`,
      `Listas de @${username}`,
    ),
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

  const lists = await getListPreviews(supabase, {
    ownerId: profile.id,
    viewerId: user?.id ?? null,
    publicOnly: true,
    limit: PAGE_SIZE,
  });
  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <main className="social-page profile-subpage">
      <Link className="page-back-link" href={`/${lang}/u/${profile.username}`}>
        <ArrowLeft size={15} /> {t.backToProfile}
      </Link>
      <header className="profile-subpage-header">
        <h1>
          {tri(
            lang,
            `Listas de ${name}`,
            `${name}'s lists`,
            `Listas de ${name}`,
          )}
        </h1>
      </header>
      {lists.length ? (
        <>
          <div className="lists-row">
            {lists.map((list) => (
              <ListPreviewCard
                key={list.id}
                list={{
                  id: list.id,
                  publicId: list.publicId,
                  name: list.name,
                  description: list.description,
                  visibility: list.visibility,
                  ranked: list.ranked,
                  kind: list.kind,
                  count: list.count,
                }}
                covers={list.covers}
                tierRows={list.tierRows}
                lang={lang}
                likes={list.likes}
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
        <div className="social-empty profile-subpage-empty">
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
    </main>
  );
}
