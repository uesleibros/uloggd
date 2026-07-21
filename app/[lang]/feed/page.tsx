import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Compass, Sparkles, UserRoundPlus } from "lucide-react";
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
import { hasLocale } from "../dictionaries";
import "./feed.css";

const PAGE_SIZE = 30;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/feed">): Promise<Metadata> {
  const { lang } = await params;
  return { title: lang === "pt-BR" ? "Seu feed" : "Your feed" };
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
          <span className="feed-eyebrow">
            <Sparkles size={13} />
            {pt ? "QUEM VOCÊ SEGUE" : "PEOPLE YOU FOLLOW"}
          </span>
          <h1>{pt ? "Seu feed" : "Your feed"}</h1>
          <p>
            {pt
              ? "Avaliações e sessões de quem você acompanha, em ordem de chegada."
              : "Reviews and sessions from the people you follow, newest first."}
          </p>
        </div>
        <Link className="feed-explore-link" href={`/${lang}/search`}>
          <Compass size={15} />
          {pt ? "Explorar jogos" : "Explore games"}
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
              ? pt
                ? "Ainda sem novidades"
                : "Nothing new yet"
              : pt
                ? "Seu feed começa aqui"
                : "Your feed starts here"}
          </h2>
          <p>
            {following.length
              ? pt
                ? "Quem você segue ainda não publicou nada. Assim que registrarem uma sessão ou avaliação, aparece aqui."
                : "The people you follow have not posted yet. As soon as they log a session or a review, it shows up here."
              : pt
                ? "Siga algumas pessoas para ver o que elas estão jogando, avaliando e terminando."
                : "Follow a few people to see what they are playing, rating and finishing."}
          </p>

          {suggestions.length > 0 && (
            <div className="feed-suggestions">
              <h3>{pt ? "Para começar" : "To get started"}</h3>
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
