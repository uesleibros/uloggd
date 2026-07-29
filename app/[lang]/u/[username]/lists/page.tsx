import { permanentRedirect } from "next/navigation";

export default async function LegacyProfileListsPage({
  params,
}: PageProps<"/[lang]/u/[username]/lists">) {
  const { lang, username } = await params;
  permanentRedirect(`/${lang}/lists/${username}`);
}
