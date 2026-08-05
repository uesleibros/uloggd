import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getOwnAgeProfile } from "@/lib/own-age-profile";
import { BackloggdImportSettings } from "@/components/settings/backloggd-import-settings";
import { privatePageMetadata } from "@/lib/seo";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";
// The import panel's styles live with the settings page, because that is where
// it used to be the only thing that needed them. Imported rather than copied:
// two stylesheets describing one component is how they drift apart.
import "../../settings/settings.css";

export const metadata = privatePageMetadata;

/**
 * The step between having a name and having anything to look at.
 *
 * Nine accounts here picked a username and never added a single game, and four
 * of them had already uploaded an avatar or written a bio — people who meant
 * to stay. Onboarding was one screen, and it let out onto a home page whose
 * personal half is empty until a library exists: what you left unfinished,
 * what is queued, who plays what you play. All three render nothing.
 *
 * The Backloggd import already worked. It was in settings, four clicks from a
 * page nobody visits on their first day, which for the audience most likely
 * to be here — people who already keep a list somewhere else — is the shortest
 * path on the site and the best hidden.
 *
 * Skippable, and it says so plainly. A first-run screen that cannot be left is
 * worse than the empty home it is trying to prevent.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login`);

  const [{ data: profile }, age] = await Promise.all([
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle(),
    getOwnAgeProfile(supabase),
  ]);
  // The steps that are actually required come first. This one is reachable
  // after onboarding is done, so it has to check rather than assume.
  if (!profile?.username || !age?.birth_date)
    redirect(`/${lang}/onboarding/username`);
  // Deliberately not redirected away once the library has games. The import
  // calls `router.refresh()` when it finishes, so a redirect on "you have
  // games now" would fire at exactly that moment and throw away the summary
  // of what came across — including the titles it could not match, which is
  // the part worth reading. Only the step before this one decides who is sent
  // here; arriving with a full library just means seeing the import tool.

  return (
    <main className="onboarding-library">
      <header>
        <span>{tri(lang, "ÚLTIMO PASSO", "LAST STEP", "ÚLTIMO PASO")}</span>
        <h1>
          {tri(
            lang,
            "Traga sua biblioteca",
            "Bring your library",
            "Trae tu biblioteca",
          )}
        </h1>
        <p>
          {tri(
            lang,
            "O uloggd fica útil quando sabe o que você joga: o que ficou pela metade, o que está na fila e quem tem o seu gosto. Se você já guarda uma lista no Backloggd, isso leva um minuto.",
            "uloggd becomes useful once it knows what you play: what you left half-finished, what is queued, and who shares your taste. If you already keep a list on Backloggd, this takes a minute.",
            "uloggd se vuelve útil cuando sabe qué juegas: lo que quedó a medias, lo que está en cola y quién comparte tu gusto. Si ya guardas una lista en Backloggd, esto lleva un minuto.",
          )}
        </p>
      </header>

      <BackloggdImportSettings lang={lang} username={profile.username} />

      <footer className="onboarding-library-exits">
        <Link className="onboarding-library-browse" href={`/${lang}/search`}>
          <Compass size={16} />
          {tri(
            lang,
            "Prefiro escolher no catálogo",
            "I would rather pick from the catalog",
            "Prefiero elegir del catálogo",
          )}
        </Link>
        <Link className="onboarding-library-skip" href={`/${lang}`}>
          {tri(lang, "Pular por agora", "Skip for now", "Omitir por ahora")}
          <ArrowRight size={15} />
        </Link>
      </footer>
    </main>
  );
}
