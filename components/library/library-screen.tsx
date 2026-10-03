import { getMediaUrl } from "@/lib/media-url";
import type { ReactNode } from "react";
import { avatarInitial } from "@/lib/avatar";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { LibraryProvider, LibraryStats, LibraryBody } from "./library-loader";
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

/**
 * The frame around somebody's library.
 *
 * It waits on the profile and on nothing else. The collection used to be read
 * here, all of it, before the page sent a byte: every row in a serial loop and
 * then every game hydrated from IGDB. The frame is the part that is known
 * immediately, so it is the part that renders immediately, and the collection
 * arrives underneath it.
 */
export function LibraryScreen({
  profile,
  owner,
  lang,
  showCreatorCovers,
  series,
}: {
  profile: Profile;
  owner: boolean;
  lang: UiLang;
  showCreatorCovers: boolean;
  /**
   * The series section, rendered on the server and handed in.
   *
   * It reads the catalogue, which this side of the app cannot do, and it is
   * slower than the shelf, which is why it arrives as a slot the page can
   * suspend on rather than as something this component fetches.
   */
  series?: ReactNode;
}) {
  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;
  return (
    <LibraryProvider
      username={profile.username}
      showCreatorCovers={showCreatorCovers}
      owner={owner}
    >
      <main className="library-page">
        <header className="library-hero">
          {profile.banner_url && (
            <Image
              src={getMediaUrl(profile.banner_url)}
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
                  src={getMediaUrl(profile.avatar_url)}
                  alt=""
                  fill
                  sizes="64px"
                  unoptimized
                />
              ) : (
                avatarInitial(profile)
              )}
            </div>
            <div className="library-owner-copy">
              <h1>
                {owner
                  ? tri(lang, "Sua biblioteca", "Your library", "Tu biblioteca")
                  : name}
              </h1>
              {/* Every other page of somebody's own things says what it holds
                  under its heading; this was the one that did not. */}
              <p>
                {owner
                  ? tri(
                      lang,
                      "Tudo que você jogou, está jogando ou quer jogar, com suas notas e o tempo registrado.",
                      "Everything you have played, are playing or want to play, with your ratings and the time you logged.",
                      "Todo lo que jugaste, estás jugando o quieres jugar, con tus notas y el tiempo registrado.",
                    )
                  : tri(
                      lang,
                      `Explore os jogos que fazem parte da jornada de @${profile.username}.`,
                      `Explore the games in @${profile.username}'s journey.`,
                      `Explora los juegos que forman parte del viaje de @${profile.username}.`,
                    )}
              </p>
            </div>
            <LibraryStats lang={lang} />
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
          </div>
          <LibraryBody lang={lang} owner={owner} />
          {series}
        </div>
      </main>
    </LibraryProvider>
  );
}
