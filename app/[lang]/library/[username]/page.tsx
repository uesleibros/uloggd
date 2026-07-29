import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";
import { notFound } from "next/navigation";
import { LibraryScreen } from "@/components/library/library-screen";
import { localeAlternates } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";

type Props = { params: Promise<{ lang: string; username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: tri(
      lang,
      `Biblioteca de @${username}`,
      `@${username}'s library`,
      `Biblioteca de @${username}`,
    ),
    description: tri(
      lang,
      `Jogos salvos, em andamento e concluídos por @${username}.`,
      `Games saved, played, and completed by @${username}.`,
      `Juegos guardados, en curso y completados por @${username}.`,
    ),
    alternates: localeAlternates(lang, `/library/${username}`),
  };
}

export default async function LibraryByUsernamePage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const [{ data: profile }, user] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url,banner_url,library_visibility",
      )
      .ilike("username", username)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!profile?.username) notFound();
  const owner = user?.id === profile.id;
  if (profile.library_visibility === "PRIVATE" && !owner)
    return (
      <main className="library-private">
        <LibraryBig size={30} />
        <h1>
          {tri(
            lang,
            "Biblioteca privada",
            "Private library",
            "Biblioteca privada",
          )}
        </h1>
        <p>
          {tri(
            lang,
            "Este usuário escolheu manter a coleção somente para si.",
            "This user chose to keep their collection private.",
            "Esta persona eligió mantener su colección solo para sí misma.",
          )}
        </p>
      </main>
    );
  const [{ data: records }, { data: viewerPreference }] = await Promise.all([
    supabase
      .from("user_games")
      .select(
        "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
      )
      .eq("profile_id", profile.id),
    user
      ? supabase
          .from("profiles")
          .select("custom_cover_scope")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const showCreatorCovers =
    owner || viewerPreference?.custom_cover_scope === "EVERYONE";
  return (
    <LibraryScreen
      profile={profile}
      records={(records ?? []).map((record) => ({
        ...record,
        custom_cover_url: showCreatorCovers ? record.custom_cover_url : null,
      }))}
      owner={owner}
      lang={lang}
    />
  );
}
