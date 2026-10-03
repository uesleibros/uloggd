"use client";
import { getMediaUrl } from "@/lib/media-url";

import Link from "next/link";
import { ArrowRight, Heart, MessageCircle } from "lucide-react";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import type { SocialEntry } from "@/components/social/activity-stream";
import { SafeImage } from "@/components/safe-image";
import { VerifiedMark } from "@/components/verified-badge";
import { LoadError } from "@/components/ui/load-error";
import type { ListPreview } from "@/lib/lists-types";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { useApi } from "@/lib/use-api";

export function CommunityHighlights({ lang }: { lang: UiLang }) {
  const t = uiText(lang);
  const popular = useApi<{ data: ListPreview[] }>(
    "/search/lists?kind=ALL&sort=likes&limit=3",
  );
  const gallery = useApi<{ data: SocialEntry[] }>(
    // Six for four slots: the spoilers and sensitive ones are dropped below,
    // and asking for eight hydrated eight games from the catalogue to draw
    // four pictures.
    "/activity?kinds=screenshot&spoilers=hide&limit=6",
  );
  const lists = popular.payload?.data ?? [];
  const shots = (gallery.payload?.data ?? [])
    .filter((entry) => entry.imageUrl && !entry.spoilers && !entry.sensitive)
    .slice(0, 4);

  if (
    !popular.loading &&
    !gallery.loading &&
    !popular.error &&
    !gallery.error &&
    lists.length === 0 &&
    shots.length === 0
  )
    return null;

  return (
    <div
      className="home-community-highlights"
      data-single={
        !popular.loading && !popular.error && lists.length === 0
          ? "shots"
          : !gallery.loading && !gallery.error && shots.length === 0
            ? "lists"
            : undefined
      }
    >
      {(popular.loading || popular.error || lists.length > 0) && (
        <section
          className="home-highlight-lists"
          aria-labelledby="home-popular-lists-title"
        >
          <div className="home-section-heading">
            <h2 id="home-popular-lists-title">
              {tri(
                lang,
                "Listas populares",
                "Popular lists",
                "Listas populares",
              )}
            </h2>
            <nav
              className="home-highlight-links"
              aria-label={tri(
                lang,
                "Explorar listas",
                "Explore lists",
                "Explorar listas",
              )}
            >
              <Link href={`/${lang}/search?scope=lists`}>{t.lists}</Link>
              <Link href={`/${lang}/search?scope=tierlists`}>
                Tierlists <ArrowRight size={14} />
              </Link>
            </nav>
          </div>
          {popular.loading ? (
            <div className="home-highlight-list-grid" aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  className="skeleton-block home-highlight-list-loading"
                  key={index}
                />
              ))}
            </div>
          ) : popular.error ? (
            <LoadError lang={lang} onRetry={popular.reload} />
          ) : (
            <div className="home-highlight-list-grid">
              {lists.map((list) => (
                <ListPreviewCard
                  key={list.id}
                  list={list}
                  covers={list.covers}
                  tierRows={list.tierRows}
                  lang={lang}
                  likes={list.likes}
                  likedByViewer={list.likedByViewer}
                  comments={list.comments}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {(gallery.loading || gallery.error || shots.length > 0) && (
        <section
          className="home-highlight-shots"
          aria-labelledby="home-gallery-title"
        >
          <div className="home-section-heading">
            <h2 id="home-gallery-title">
              {tri(
                lang,
                "Capturas da comunidade",
                "Community screenshots",
                "Capturas de la comunidad",
              )}
            </h2>
          </div>
          {gallery.loading ? (
            <div className="home-highlight-photo-grid" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <span
                  className="skeleton-block home-highlight-photo-loading"
                  key={index}
                />
              ))}
            </div>
          ) : gallery.error ? (
            <LoadError lang={lang} onRetry={gallery.reload} />
          ) : (
            <div className="home-highlight-photo-grid">
              {shots.map((shot, index) => (
                <div
                  key={shot.id}
                  className="home-highlight-shot"
                  data-context-kind="screenshot"
                  data-context-title={shot.game?.name ?? shot.gameSlug}
                >
                  <Link
                    prefetch={false}
                    className="home-highlight-shot-image"
                    data-context-link
                    href={`/${lang}/shot/${shot.publicId ?? shot.id}`}
                    aria-label={tri(
                      lang,
                      `Abrir captura de ${shot.game?.name ?? shot.gameSlug}`,
                      `Open screenshot from ${shot.game?.name ?? shot.gameSlug}`,
                      `Abrir captura de ${shot.game?.name ?? shot.gameSlug}`,
                    )}
                  >
                    <SafeImage
                      src={getMediaUrl(shot.imageUrl)!}
                      fallbackSrc={shot.game?.coverUrl}
                      alt={shot.content || shot.game?.name || shot.gameSlug}
                      fill
                      sizes="(max-width: 620px) 45vw, (max-width: 1200px) 19vw, 240px"
                      loading={index < 2 ? "eager" : "lazy"}
                      unoptimized
                    />
                  </Link>
                  <Link
                    prefetch={false}
                    className="home-highlight-shot-game"
                    data-context-link
                    href={`/${lang}/game/${shot.gameSlug}`}
                  >
                    {shot.game?.name ?? shot.gameSlug}
                  </Link>
                  {/* The same byline the list cards use, class and all: one
                      way of naming a person, wherever they are named. */}
                  <Link
                    prefetch={false}
                    className="list-preview-owner home-highlight-shot-author"
                    href={`/${lang}/u/${shot.profile.username}`}
                  >
                    <span className="list-preview-owner-avatar" aria-hidden>
                      {shot.profile.avatar_url ? (
                        <SafeImage
                          src={getMediaUrl(shot.profile.avatar_url)}
                          alt=""
                          fill
                          sizes="18px"
                          unoptimized
                        />
                      ) : (
                        (shot.profile.display_name || shot.profile.username)
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </span>
                    <b>{shot.profile.display_name || shot.profile.username}</b>
                    {shot.profile.verified && <VerifiedMark size={11} />}
                    <small>@{shot.profile.username}</small>
                  </Link>
                  <span className="home-highlight-shot-meta">
                    <Link
                      prefetch={false}
                      href={`/${lang}/shot/${shot.publicId ?? shot.id}`}
                      aria-label={tri(
                        lang,
                        "Ver curtidas da captura",
                        "View screenshot likes",
                        "Ver me gusta de la captura",
                      )}
                      className="list-preview-likes"
                      data-mine={shot.likedByViewer || undefined}
                    >
                      <Heart
                        size={11}
                        fill={shot.likedByViewer ? "currentColor" : "none"}
                      />
                      {(shot.likes ?? 0).toLocaleString(lang)}
                    </Link>
                    <Link
                      prefetch={false}
                      href={`/${lang}/shot/${shot.publicId ?? shot.id}#content-comments-title`}
                      className="list-preview-likes"
                      aria-label={tri(
                        lang,
                        "Ver comentários da captura",
                        "View screenshot comments",
                        "Ver comentarios de la captura",
                      )}
                    >
                      <MessageCircle size={11} />
                      {(shot.comments ?? 0).toLocaleString(lang)}
                    </Link>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
