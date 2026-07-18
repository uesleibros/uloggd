import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";
import { notFound } from "next/navigation";
import { LibraryScreen } from "@/components/library/library-screen";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../../dictionaries";

type Props = { params: Promise<{ lang: string; username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title:
      lang === "pt-BR"
        ? `Biblioteca de @${username}`
        : `@${username}'s library`,
  };
}

export default async function PublicLibraryPage({ params }: Props) {
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
        <h1>{lang === "pt-BR" ? "Biblioteca privada" : "Private library"}</h1>
        <p>
          {lang === "pt-BR"
            ? "Este usuário escolheu manter a coleção somente para si."
            : "This user chose to keep their collection private."}
        </p>
      </main>
    );
  const { data: records } = await supabase
    .from("user_games")
    .select(
      "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
    )
    .eq("profile_id", profile.id);
  return (
    <LibraryScreen
      profile={profile}
      records={records ?? []}
      owner={owner}
      lang={lang}
    />
  );
}
