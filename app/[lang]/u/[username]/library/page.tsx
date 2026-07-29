import { permanentRedirect } from "next/navigation";

export default async function LegacyPublicLibraryPage({
  params,
}: PageProps<"/[lang]/u/[username]/library">) {
  const { lang, username } = await params;
  permanentRedirect(`/${lang}/library/${username}`);
}
