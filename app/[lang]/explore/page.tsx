import Link from "next/link";
import { List, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { getActivity } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../dictionaries";

export default async function ExplorePage({
  params,
}: PageProps<"/[lang]/explore">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const [entries, { data: lists }] = await Promise.all([
    getActivity(supabase, { limit: 24 }),
    supabase
      .from("game_lists")
      .select(
        "id,name,description,updated_at,profiles!game_lists_profile_id_fkey(username,display_name),game_list_items(count)",
      )
      .eq("visibility", "PUBLIC")
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);
  const pt = lang === "pt-BR";
  return (
    <main className="social-page social-explore-page">
      <header className="social-page-header">
        <span>
          <Sparkles size={14} /> {pt ? "COMUNIDADE" : "COMMUNITY"}
        </span>
        <h1>{pt ? "Explorar" : "Explore"}</h1>
        <p>
          {pt
            ? "Avaliações, sessões e listas recentes da comunidade."
            : "Recent reviews, sessions, and lists from the community."}
        </p>
      </header>
      <div className="explore-layout">
        <section>
          <div className="social-section-title">
            <h2>{pt ? "Atividade recente" : "Recent activity"}</h2>
            <p>
              {pt
                ? "O que a comunidade está jogando agora"
                : "What the community is playing now"}
            </p>
          </div>
          <ActivityStream entries={entries} lang={lang} />
        </section>
        <aside className="explore-lists">
          <div className="social-section-title">
            <h2>{pt ? "Listas recentes" : "Recent lists"}</h2>
          </div>
          {(lists ?? []).map((list) => {
            const owner = Array.isArray(list.profiles)
              ? list.profiles[0]
              : list.profiles;
            const count = Array.isArray(list.game_list_items)
              ? (list.game_list_items[0]?.count ?? 0)
              : 0;
            return (
              <Link href={`/${lang}/lists/${list.id}`} key={list.id}>
                <List size={16} />
                <div>
                  <strong>{list.name}</strong>
                  <p>
                    {list.description ||
                      (pt
                        ? "Uma coleção da comunidade"
                        : "A community collection")}
                  </p>
                  <small>
                    @{owner?.username} · {count} {pt ? "jogos" : "games"}
                  </small>
                </div>
              </Link>
            );
          })}
        </aside>
      </div>
    </main>
  );
}
