import { notFound, redirect } from "next/navigation";
import { LibraryCollection } from "@/components/library/library-collection";
import { getGamesByIds } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../dictionaries";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/library`);

  const { data: records } = await supabase
    .from("user_games")
    .select(
      "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
    )
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });
  const games = await getGamesByIds(
    (records ?? []).map((record) => record.igdb_id),
  );

  return (
    <main className="library-page">
      <header>
        <span>{lang === "pt-BR" ? "Sua coleção" : "Your collection"}</span>
        <h1>{lang === "pt-BR" ? "Biblioteca" : "Library"}</h1>
        <p>
          {lang === "pt-BR"
            ? "Passe sobre uma capa para atualizar status, nota ou escolher outra imagem."
            : "Hover over a cover to update status, rating, or choose another image."}
        </p>
      </header>
      <LibraryCollection games={games} records={records ?? []} lang={lang} />
    </main>
  );
}
