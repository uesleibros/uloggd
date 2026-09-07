import { notFound, redirect } from "next/navigation";
import { UsernamePanel } from "@/components/auth/username-panel";
import { BirthDatePanel } from "@/components/auth/birth-date-panel";
import { serverApi, settleServer } from "@/lib/api-server";
import { hasLocale } from "../../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  // Three asks, in parallel, because the three answers live behind three
  // routes: who you are, whether the age step is done, and whether there is
  // anything in the library yet.
  const [{ data: me }, { data: age }, { data: library }] = await Promise.all([
    settleServer(serverApi.get<{ owner: { username: string | null } }>("/me")),
    settleServer(
      serverApi.get<{ data: { birth_date: string | null } }>(
        "/account/birth-date",
      ),
    ),
    settleServer(
      serverApi.get<{ page: { total_items: number } }>("/library?page=1"),
    ),
  ]);
  if (!me) redirect(`/${lang}/login`);
  const games = library?.page.total_items ?? 0;
  // Named and dated, so this screen is done. One more offer before the home
  // page, and only for an account with nothing in it: the home page's personal
  // half is blank without a library, and nine accounts stopped exactly here.
  if (me.owner.username && age?.data.birth_date)
    redirect(games ? `/${lang}` : `/${lang}/onboarding/library`);
  return (
    <main className="login-shell auth-single">
      {me.owner.username ? (
        <BirthDatePanel lang={lang} />
      ) : (
        <UsernamePanel lang={lang} />
      )}
    </main>
  );
}
