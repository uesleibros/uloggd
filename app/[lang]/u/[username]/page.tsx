import Image from "next/image";
import Link from "next/link";
import { BookOpen, Gamepad2, List, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { getGamesByIds } from "@/lib/igdb";
import { getActivity } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../dictionaries";

export default async function ProfilePage({
  params,
}: PageProps<"/[lang]/u/[username]">) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id,username,display_name,pronouns,bio,avatar_url,banner_url,created_at",
    )
    .ilike("username", username)
    .maybeSingle();
  if (!profile?.username) notFound();
  const [{ data: library }, { data: lists }, entries] = await Promise.all([
    supabase
      .from("user_games")
      .select(
        "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
      )
      .eq("profile_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("game_lists")
      .select("id,name,description,game_list_items(count)")
      .eq("profile_id", profile.id)
      .eq("visibility", "PUBLIC")
      .order("updated_at", { ascending: false })
      .limit(4),
    getActivity(supabase, { profileId: profile.id, limit: 12 }),
  ]);
  const games = await getGamesByIds(
    (library ?? []).map((item) => item.igdb_id),
  );
  const byId = new Map(games.map((game) => [game.id, game]));
  const pt = lang === "pt-BR";
  const ratings = (library ?? []).filter((item) => item.quick_rating !== null);
  return (
    <main className="profile-page">
      <div className="profile-banner">
        {profile.banner_url && (
          <Image
            src={profile.banner_url}
            alt=""
            fill
            priority
            sizes="1200px"
            unoptimized
          />
        )}
      </div>
      <header className="profile-header">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              fill
              sizes="112px"
              unoptimized
            />
          ) : (
            profile.username.slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <h1>{profile.display_name || `@${profile.username}`}</h1>
          <p className="profile-handle">
            @{profile.username}
            {profile.pronouns ? ` · ${profile.pronouns}` : ""}
          </p>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </div>
      </header>
      <dl className="profile-stats">
        <div>
          <dt>
            <Gamepad2 size={14} /> {pt ? "Jogos" : "Games"}
          </dt>
          <dd>{library?.length ?? 0}</dd>
        </div>
        <div>
          <dt>
            <Star size={14} /> {pt ? "Avaliados" : "Rated"}
          </dt>
          <dd>{ratings.length}</dd>
        </div>
        <div>
          <dt>
            <BookOpen size={14} /> {pt ? "Entradas" : "Entries"}
          </dt>
          <dd>{entries.length}</dd>
        </div>
        <div>
          <dt>
            <List size={14} /> {pt ? "Listas" : "Lists"}
          </dt>
          <dd>{lists?.length ?? 0}</dd>
        </div>
      </dl>
      {(library?.length ?? 0) > 0 && (
        <section className="profile-shelf">
          <div className="social-section-title">
            <h2>{pt ? "Jogos recentes" : "Recent games"}</h2>
            <Link href={`/${lang}/library`}>
              {pt ? "Ver biblioteca" : "View library"}
            </Link>
          </div>
          <div className="cover-shelf">
            {(library ?? []).slice(0, 5).map((record) => {
              const game = byId.get(record.igdb_id);
              return game ? (
                <QuickGameCard
                  key={game.id}
                  game={game}
                  initial={record}
                  lang={lang}
                  enabled={false}
                />
              ) : null;
            })}
          </div>
        </section>
      )}
      <section className="profile-content-grid">
        <div>
          <div className="social-section-title">
            <h2>{pt ? "Atividade" : "Activity"}</h2>
          </div>
          <ActivityStream entries={entries} lang={lang} />
        </div>
        <aside className="profile-lists">
          <div className="social-section-title">
            <h2>{pt ? "Listas" : "Lists"}</h2>
          </div>
          {(lists ?? []).map((list) => (
            <Link href={`/${lang}/lists/${list.id}`} key={list.id}>
              <strong>{list.name}</strong>
              <p>
                {list.description || (pt ? "Sem descrição" : "No description")}
              </p>
            </Link>
          ))}
        </aside>
      </section>
    </main>
  );
}
