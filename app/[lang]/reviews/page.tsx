import { BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { getActivity } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../dictionaries";

export default async function ReviewsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/reviews">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/reviews`);
  const entries = await getActivity(supabase, {
    profileId: user.id,
    limit: 60,
  });
  const requestedType = (await searchParams).type;
  const activeType =
    requestedType === "review" || requestedType === "diary"
      ? requestedType
      : "all";
  const visibleEntries =
    activeType === "all"
      ? entries
      : entries.filter((entry) => entry.kind === activeType);
  const pt = lang === "pt-BR";
  return (
    <main className="social-page">
      <header className="social-page-header">
        <span>
          <BookOpen size={14} /> {pt ? "SEU HISTÓRICO" : "YOUR HISTORY"}
        </span>
        <h1>{pt ? "Diário e avaliações" : "Diary & reviews"}</h1>
        <p>
          {pt
            ? "Todas as sessões e opiniões que formam sua jornada."
            : "Every session and opinion that shapes your journey."}
        </p>
      </header>
      <nav
        className="social-filter-tabs"
        aria-label={pt ? "Filtrar registros" : "Filter entries"}
      >
        {[
          ["all", pt ? "Tudo" : "All"],
          ["review", pt ? "Avaliações" : "Reviews"],
          ["diary", pt ? "Sessões" : "Sessions"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={
              value === "all"
                ? `/${lang}/reviews`
                : `/${lang}/reviews?type=${value}`
            }
            aria-current={activeType === value ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ActivityStream entries={visibleEntries} lang={lang} viewerId={user.id} />
    </main>
  );
}
