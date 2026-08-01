import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gamepad2, LibraryBig, Star } from "lucide-react";
import { getGamesByIds } from "@/lib/igdb";
import { LibraryCollection, type LibraryRecord } from "./library-collection";
import { LibraryLiveStats } from "./library-live-stats";
import {
  LibraryPrivacyControl,
  type LibraryVisibility,
} from "./library-privacy-control";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Profile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  library_visibility: LibraryVisibility;
};

export async function LibraryScreen({
  profile,
  records,
  owner,
  lang,
}: {
  profile: Profile;
  records: LibraryRecord[];
  owner: boolean;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const games = await getGamesByIds(records.map((record) => record.igdb_id));
  const name = profile.display_name || `@${profile.username}`;
  return (
    <main className="library-page">
      <header className="library-hero">
        {profile.banner_url && (
          <Image
            src={profile.banner_url}
            alt=""
            fill
            priority
            sizes="1200px"
            unoptimized
          />
        )}
        <div className="library-hero-scrim" />
        <div className="library-hero-content">
          <div className="library-owner-avatar">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                fill
                sizes="64px"
                unoptimized
              />
            ) : (
              profile.username.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="library-owner-copy">
            {!owner && (
              <span>
                <LibraryBig size={14} />
                {tri(
                  lang,
                  "BIBLIOTECA PÚBLICA",
                  "PUBLIC LIBRARY",
                  "BIBLIOTECA PÚBLICA",
                )}
              </span>
            )}
            <h1>
              {owner
                ? tri(lang, "Sua biblioteca", "Your library", "Tu biblioteca")
                : name}
            </h1>
            <p>
              {owner
                ? tri(
                    lang,
                    "Organize sua jornada, encontre o próximo jogo e ajuste cada prateleira ao seu jeito.",
                    "Organize your journey, find what to play next, and shape every shelf your way.",
                    "Organiza tu recorrido, encuentra el próximo juego y ajusta cada estante a tu manera.",
                  )
                : pt
                  ? `Explore os jogos que fazem parte da jornada de @${profile.username}.`
                  : `Explore the games in @${profile.username}'s journey.`}
            </p>
          </div>
          <LibraryLiveStats records={records} lang={lang} />
        </div>
      </header>
      <div className="library-page-body">
        <div className="library-context-bar">
          {/* Shown to the owner too. Reviews and screenshots always offer it,
              and someone on their own library needs the way back as much as a
              visitor does, arguably more since they arrived from the sidebar
              rather than from the profile. */}
          <Link
            className="page-back-link"
            href={`/${lang}/u/${profile.username}`}
          >
            <ArrowLeft size={15} />
            {t.backToProfile}
          </Link>
          {owner ? (
            <LibraryPrivacyControl
              initial={profile.library_visibility}
              lang={lang}
            />
          ) : (
            <div className="library-public-note">
              <Gamepad2 size={16} />
              <span>
                {tri(
                  lang,
                  "Você está vendo uma coleção pública. As notas são deste usuário e as capas seguem suas preferências.",
                  "You are viewing a public collection. Ratings belong to this user and covers follow your preferences.",
                  "Estás viendo una colección pública. Las notas son de este usuario y las portadas siguen tus preferencias.",
                )}
              </span>
            </div>
          )}
          {records.some((record) => record.quick_rating !== null) && (
            <span className="library-rating-note">
              <Star size={13} fill="currentColor" />
              {tri(
                lang,
                "Notas pessoais em escala de 5 estrelas",
                "Personal ratings on a 5-star scale",
                "Notas personales en escala de 5 estrellas",
              )}
            </span>
          )}
        </div>
        <LibraryCollection
          games={games}
          records={records}
          lang={lang}
          owner={owner}
        />
      </div>
    </main>
  );
}
