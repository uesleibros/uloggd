import type { Metadata } from "next";
import { ArrowLeft, Layers3, List } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import { LoadMoreLists } from "@/components/social/load-more-lists";
import { getListPreviews } from "@/lib/lists";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { hasLocale } from "../../../dictionaries";
import "../../../profile.css";

type Props = { params: Promise<{ lang: string; username: string }> };

const PAGE_SIZE = 24;

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

  const lists = await getListPreviews(supabase, {
    ownerId: profile.id,
    viewerId: user?.id ?? null,
    publicOnly: true,
    limit: PAGE_SIZE,
  });
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
      {lists.length ? (
        <>
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
