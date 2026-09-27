"use client";

import Image from "next/image";
import Link from "next/link";
import { Disc3, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import {
  copyDetail,
  copyLabel,
  mediumLabel,
  ownershipLabel,
  storefrontLabel,
  type Copy,
} from "@/lib/library-copies";
import { COPIES_CHANGED_EVENT } from "@/lib/copies-event";
import { tri, type UiLang } from "@/lib/ui-text";

type CatalogGame = {
  id: number;
  slug: string;
  name: string;
  cover_url: string;
  release_year: number | null;
};

type Facet = "platform" | "medium" | "ownership" | "storefront";

/**
 * The same library, counted by copy instead of by game.
 *
 * The library answers "which games are mine". This answers the other
 * question people have about the same shelf: what do I have physically, what
 * is on Steam, what am I only renting through a subscription, and which games
 * do I own twice. A game can appear several times here, which is exactly why
 * it is a separate view and not a filter on the other one: the count of games
 * must keep meaning games.
 *
 * Read once, filtered in the browser. A person's copies are tens of rows, not
 * thousands, and every filter here is a facet of what was already fetched.
 */
export function LibraryCopies({
  lang,
  onEmpty,
}: {
  lang: UiLang;
  onEmpty?: () => void;
}) {
  const [copies, setCopies] = useState<Copy[] | null>(null);
  const [games, setGames] = useState<Map<number, CatalogGame>>(new Map());
  const [failed, setFailed] = useState(false);
  const [facets, setFacets] = useState<Record<Facet, string | null>>({
    platform: null,
    medium: null,
    ownership: null,
    storefront: null,
  });

  useEffect(() => {
    let live = true;
    async function load() {
      // The envelope carries two lists, so this reads it whole rather than
      // through `settle`, which unwraps `data` for the usual one-list case.
      const answer = await api
        .get<{ data: Copy[]; games: CatalogGame[] }>("/library/copies?games=1")
        .catch(() => null);
      if (!live) return;
      if (!answer) {
        setFailed(true);
        return;
      }
      setCopies(answer.data);
      setGames(new Map(answer.games.map((game) => [game.id, game])));
      if (!answer.data.length) onEmpty?.();
    }
    void load();
    const again = () => void load();
    window.addEventListener(COPIES_CHANGED_EVENT, again);
    return () => {
      live = false;
      window.removeEventListener(COPIES_CHANGED_EVENT, again);
    };
  }, [onEmpty]);

  const options = useMemo(() => {
    const rows = copies ?? [];
    const count = (pick: (copy: Copy) => string | null) => {
      const tally = new Map<string, number>();
      for (const copy of rows) {
        const value = pick(copy);
        if (value) tally.set(value, (tally.get(value) ?? 0) + 1);
      }
      return [...tally.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      platform: count((copy) => copy.platform_name),
      medium: count((copy) => copy.medium),
      ownership: count((copy) => copy.ownership),
      storefront: count((copy) => copy.storefront),
    };
  }, [copies]);

  const shown = useMemo(
    () =>
      (copies ?? []).filter(
        (copy) =>
          (!facets.platform || copy.platform_name === facets.platform) &&
          (!facets.medium || copy.medium === facets.medium) &&
          (!facets.ownership || copy.ownership === facets.ownership) &&
          (!facets.storefront || copy.storefront === facets.storefront),
      ),
    [copies, facets],
  );

  // Owning a game twice is a thing people want to see, and it is the one
  // count this view can give that the games view cannot.
  const twice = useMemo(() => {
    const perGame = new Map<number, number>();
    for (const copy of copies ?? [])
      perGame.set(copy.igdb_id, (perGame.get(copy.igdb_id) ?? 0) + 1);
    return [...perGame.values()].filter((total) => total > 1).length;
  }, [copies]);

  if (failed)
    return (
      <p className="library-copies-empty">
        {tri(
          lang,
          "Não deu para carregar suas cópias.",
          "Your copies could not be loaded.",
          "No se pudieron cargar tus copias.",
        )}
      </p>
    );

  if (!copies)
    return (
      <p className="library-copies-empty">
        <LoaderCircle size={15} className="spin" aria-hidden />
      </p>
    );

  if (!copies.length)
    return (
      <p className="library-copies-empty">
        {tri(
          lang,
          "Você ainda não registrou nenhuma cópia. Elas ficam na página de cada jogo, em Suas cópias.",
          "You have not recorded a copy yet. They live on each game's page, under Your copies.",
          "Todavía no registraste ninguna copia. Están en la página de cada juego, en Tus copias.",
        )}
      </p>
    );

  const facetRow = (
    facet: Facet,
    title: string,
    label: (value: string) => string,
  ) =>
    options[facet].length > 1 && (
      <div className="library-copies-facet" key={facet}>
        <span>{title}</span>
        <div role="group" aria-label={title}>
          {options[facet].map(([value, total]) => (
            <button
              key={value}
              type="button"
              data-active={facets[facet] === value || undefined}
              aria-pressed={facets[facet] === value}
              onClick={() =>
                setFacets((was) => ({
                  ...was,
                  [facet]: was[facet] === value ? null : value,
                }))
              }
            >
              {label(value)}
              <strong>{total}</strong>
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <section className="library-copies">
      <header>
        <p>
          <Disc3 size={13} aria-hidden />
          {tri(
            lang,
            `${copies.length} cópias de ${new Set(copies.map((copy) => copy.igdb_id)).size} jogos`,
            `${copies.length} copies of ${new Set(copies.map((copy) => copy.igdb_id)).size} games`,
            `${copies.length} copias de ${new Set(copies.map((copy) => copy.igdb_id)).size} juegos`,
          )}
          {twice > 0 && (
            <small>
              {tri(
                lang,
                `${twice} em mais de uma plataforma`,
                `${twice} on more than one platform`,
                `${twice} en más de una plataforma`,
              )}
            </small>
          )}
        </p>
      </header>

      <div className="library-copies-facets">
        {facetRow(
          "platform",
          tri(lang, "Plataforma", "Platform", "Plataforma"),
          (value) => value,
        )}
        {facetRow("medium", tri(lang, "Mídia", "Medium", "Medio"), (value) =>
          mediumLabel(value, lang),
        )}
        {facetRow(
          "ownership",
          tri(lang, "Posse", "Ownership", "Posesión"),
          (value) => ownershipLabel(value, lang),
        )}
        {facetRow(
          "storefront",
          tri(lang, "Loja", "Storefront", "Tienda"),
          (value) => storefrontLabel(value, lang),
        )}
      </div>

      <ul className="library-copies-list">
        {shown.map((copy) => {
          const game = games.get(copy.igdb_id);
          const detail = copyDetail(copy, lang);
          return (
            <li key={copy.id}>
              <Link href={`/${lang}/game/${game?.slug ?? copy.game_slug}`}>
                <span className="library-copies-cover">
                  {game?.cover_url && (
                    <Image src={game.cover_url} alt="" fill sizes="56px" />
                  )}
                </span>
                <span className="library-copies-text">
                  <strong>{game?.name ?? copy.game_slug}</strong>
                  <span>{copyLabel(copy, lang)}</span>
                  {detail && <small>{detail}</small>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {!shown.length && (
        <p className="library-copies-empty">
          {tri(
            lang,
            "Nenhuma cópia com esses filtros.",
            "No copies match those filters.",
            "Ninguna copia con esos filtros.",
          )}
        </p>
      )}
    </section>
  );
}
