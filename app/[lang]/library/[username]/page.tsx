import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";
import { notFound } from "next/navigation";
import { LibraryScreen } from "@/components/library/library-screen";
import { privatePageMetadata, socialMetadata } from "@/lib/seo";
import { getAuthUser } from "@/lib/supabase/auth";
import { getPublicProfile } from "@/lib/profiles";
import { serverApi, settleServer } from "@/lib/api-server";
import type { ProfileLibraryRecord, ProfileSummary } from "@/lib/profile-types";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";

type Props = { params: Promise<{ lang: string; username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  const profile = (await getPublicProfile(username))?.data;
  if (!profile?.username) return privatePageMetadata;
  if (profile.library_visibility !== "PUBLIC")
    return {
      title: tri(
        lang,
        `Biblioteca privada de @${profile.username}`,
        `@${profile.username}'s private library`,
        `Biblioteca privada de @${profile.username}`,
      ),
      ...privatePageMetadata,
    };
  const canonicalUsername = profile.username;
  const title = tri(
    lang,
    `Biblioteca de @${canonicalUsername}`,
    `@${canonicalUsername}'s library`,
    `Biblioteca de @${canonicalUsername}`,
  );
  const description = tri(
    lang,
    `Jogos salvos, em andamento e concluídos por @${canonicalUsername}.`,
    `Games saved, played, and completed by @${canonicalUsername}.`,
    `Juegos guardados, en curso y completados por @${canonicalUsername}.`,
  );
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: `/library/${canonicalUsername}`,
      title,
      description,
      type: "profile",
    }),
  };
}

export default async function LibraryByUsernamePage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const [response, user, summary] = await Promise.all([
    getPublicProfile(username),
    getAuthUser(),
    settleServer(
      serverApi.get<{ data: ProfileSummary }>(
        `/profiles/${encodeURIComponent(username)}/summary`,
      ),
    ),
  ]);
  const profile = response?.data;
  if (!profile?.username) notFound();
  const owner = user?.id === profile.id;
  // A followers-only library is unreadable to a stranger through row-level
  // security, so without this check they would pass the door and find an empty
  // shelf, which reads as "this person owns nothing" rather than "you cannot
  // see this". The gate says which of the two it is.
  const followsOwner = summary.data?.data.viewer_follows ?? false;
  const restricted =
    !owner &&
    (profile.library_visibility === "PRIVATE" ||
      (profile.library_visibility === "FOLLOWERS" && !followsOwner));
  if (restricted)
    return (
      <main className="library-private">
        <LibraryBig size={30} />
        <h1>
          {profile.library_visibility === "FOLLOWERS"
            ? tri(
                lang,
                "Biblioteca para seguidores",
                "Followers-only library",
                "Biblioteca para seguidores",
              )
            : tri(
                lang,
                "Biblioteca privada",
                "Private library",
                "Biblioteca privada",
              )}
        </h1>
        <p>
          {profile.library_visibility === "FOLLOWERS"
            ? tri(
                lang,
                `Siga @${profile.username} para ver esta coleção.`,
                `Follow @${profile.username} to see this collection.`,
                `Sigue a @${profile.username} para ver esta colección.`,
              )
            : tri(
                lang,
                "Este usuário escolheu manter a coleção somente para si.",
                "This user chose to keep their collection private.",
                "Esta persona eligió mantener su colección solo para sí misma.",
              )}
        </p>
      </main>
    );
  const [records, preference] = await Promise.all([
    (async () => {
      const records: ProfileLibraryRecord[] = [];
      // Keep large libraries complete while the API bounds every response.
      for (let page = 1; ; page++) {
        const result = await serverApi.get<{
          data: ProfileLibraryRecord[];
          has_more: boolean;
        }>(
          `/profiles/${encodeURIComponent(username)}/library?limit=1000&page=${page}`,
        );
        records.push(...result.data);
        if (!result.has_more) return records;
      }
    })(),
    user
      ? settleServer(
          serverApi.get<{ data: { custom_cover_scope: string } }>("/profile"),
        )
      : null,
  ]);
  const viewerPreference = preference?.data?.data;
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
