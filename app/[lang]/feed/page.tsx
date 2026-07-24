import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Compass, UserRoundPlus } from "lucide-react";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { FollowButton } from "@/components/social/follow-button";
import { VerifiedMark } from "@/components/verified-badge";
import {
  getActivity,
  getFollowingIds,
  getSuggestedProfiles,
} from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale, resolveLocale } from "../dictionaries";
import "./feed.css";
import { tri } from "@/lib/ui-text";

const PAGE_SIZE = 30;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/feed">): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: tri(resolveLocale(lang), "Seu feed", "Your feed", "Tu feed"),
  };
}

export default async function FeedPage({ params }: PageProps<"/[lang]/feed">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const pt = lang === "pt-BR";
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/feed`);

  const supabase = await getSupabase();
  const following = await getFollowingIds(supabase, user.id);
  // Suggestions are only worth fetching when there is room for them.
  const [entries, suggestions] = await Promise.all([
    getActivity(supabase, {
      profileIds: following,
      viewerId: user.id,
      limit: PAGE_SIZE,
    }),
    following.length > 8
      ? Promise.resolve([])
      : getSuggestedProfiles(supabase, user.id, { exclude: following }),
  ]);

  return (
    <main className="social-page feed-page">
      <header className="feed-header">
        <div>
          <h1>{tri(lang, "Seu feed", "Your feed", "Tu feed")}</h1>
        </div>
        <Link className="feed-explore-link" href={`/${lang}/search`}>
          <Compass size={15} />
          {tri(lang, "Explorar jogos", "Explore games", "Explorar juegos")}
        </Link>
      </header>

      {entries.length > 0 ? (
        <>
          <ActivityStream entries={entries} lang={lang} viewerId={user.id} />
          <LoadMoreActivity
            lang={lang}
            viewerId={user.id}
            feed="following"
            pageSize={PAGE_SIZE}
            initialCursor={
              entries.length ? entries[entries.length - 1].createdAt : null
            }
            hasMore={entries.length === PAGE_SIZE}
          />
        </>
      ) : (
        <section className="feed-empty">
          <span aria-hidden>
            <UserRoundPlus size={24} />
          </span>
          <h2>
            {following.length
              ? tri(
                  lang,
                  "Ainda sem novidades",
                  "Nothing new yet",
                  "Todavía sin novedades",
                )
              : tri(
                  lang,
                  "Seu feed começa aqui",
                  "Your feed starts here",
                  "Tu feed empieza aquí",
                )}
          </h2>
          <p>
            {following.length
              ? tri(
                  lang,
                  "Quem você segue ainda não publicou nada. Assim que registrarem uma sessão ou avaliação, aparece aqui.",
                  "The people you follow have not posted yet. As soon as they log a session or a review, it shows up here.",
                  "Quienes sigues todavía no han publicado nada. En cuanto registren una sesión o reseña, aparecerá aquí.",
                )
              : tri(
                  lang,
                  "Siga algumas pessoas para ver o que elas estão jogando, avaliando e terminando.",
                  "Follow a few people to see what they are playing, rating and finishing.",
                  "Sigue a algunas personas para ver qué están jugando, valorando y terminando.",
                )}
          </p>

          {suggestions.length > 0 && (
            <div className="feed-suggestions">
              <h3>
                {tri(lang, "Para começar", "To get started", "Para empezar")}
              </h3>
              <ul>
                {suggestions.map((person) => (
                  <li key={person.id}>
                    <Link href={`/${lang}/u/${person.username}`}>
                      <span className="feed-suggestion-avatar">
                        {person.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.avatarUrl} alt="" />
                        ) : (
                          (person.displayName || person.username)
                            .slice(0, 1)
                            .toUpperCase()
                        )}
                      </span>
                      <span className="feed-suggestion-copy">
                        <strong>
                          {person.displayName || `@${person.username}`}
                          {person.verified && <VerifiedMark size={14} />}
                        </strong>
                        <small>
                          {person.reviewCount > 0
                            ? pt
                              ? `${person.reviewCount} avaliação${person.reviewCount > 1 ? "ões" : ""}`
                              : `${person.reviewCount} review${person.reviewCount > 1 ? "s" : ""}`
                            : `@${person.username}`}
                        </small>
                      </span>
                    </Link>
                    <FollowButton
                      lang={lang}
                      profileId={person.id}
                      viewerId={user.id}
                      profileName={person.displayName || person.username}
                      initial={false}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
