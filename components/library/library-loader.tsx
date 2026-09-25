"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { LibraryLiveStats } from "@/components/library/library-live-stats";
import {
  LibraryCollection,
  type LibraryRecord,
} from "@/components/library/library-collection";
import { LibraryCollectionSkeleton } from "@/components/library/library-skeleton";
import type { Game } from "@/lib/igdb";
import { tri, type UiLang } from "@/lib/ui-text";
import { LoadError } from "@/components/ui/load-error";

type Page = {
  data: LibraryRecord[];
  has_more: boolean;
  games: Game[];
};

type Loaded = {
  /** Which library this is, so an answer cannot be shown under another name. */
  username: string;
  attempt: number;
  records: LibraryRecord[];
  games: Game[];
  /** The first page could not be read. */
  failed: boolean;
};

const LibraryData = createContext<{
  /** Null until this library's own first page lands. */
  records: LibraryRecord[] | null;
  games: Game[];
  failed: boolean;
  retry: () => void;
}>({ records: null, games: [], failed: false, retry: () => {} });

/**
 * A library, read by the browser, a page at a time.
 *
 * The page used to walk the whole collection on the server before sending a
 * byte: every row, in a loop whose next request could not start until the last
 * one answered, and then every game hydrated from IGDB. Nothing was on screen
 * until all of it finished, and the covers it was waiting for are the one thing
 * a visitor cannot read before they arrive anyway.
 *
 * So the first page draws and the rest appends behind it. `games=1` means the
 * rows and their catalogue entries come together, because a row is an id and a
 * screen is covers: asked separately, the second request cannot even start
 * until the first has answered.
 *
 * A provider rather than a hook per section, because three parts of this page
 * read the same library from three different places in the document: the
 * counters in the hero, the note in the context bar, and the collection itself.
 */
export function LibraryProvider({
  username,
  showCreatorCovers,
  children,
}: {
  username: string;
  /**
   * Whether the owner's own cover art is theirs to show here. The owner always
   * sees it; anybody else only if the owner shares it.
   */
  showCreatorCovers: boolean;
  children: React.ReactNode;
}) {
  // Tagged with the name it was read for, and compared on render, so switching
  // to another library reads as loading immediately without this having to set
  // state inside the effect to say so.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current =
    loaded?.username === username && loaded.attempt === attempt ? loaded : null;

  useEffect(() => {
    let listening = true;

    void (async () => {
      const records: LibraryRecord[] = [];
      const games: Game[] = [];
      for (let page = 1; listening; page += 1) {
        let answer: Page;
        try {
          answer = await api.get<Page>(
            `/profiles/${encodeURIComponent(username)}/library?limit=200&page=${page}&games=1`,
          );
        } catch {
          // A page that fails leaves whatever already arrived on screen, rather
          // than replacing a working shelf with nothing.
          // A first page that fails is a failure, not an empty library: this
          // used to hand the collection an empty list, which it drew as "no
          // games in this library" for somebody with hundreds. Later pages
          // failing leave what already arrived on screen.
          if (listening && !records.length)
            setLoaded({
              username,
              attempt,
              records: [],
              games: [],
              failed: true,
            });
          return;
        }
        if (!listening) return;
        records.push(
          ...answer.data.map((record) => ({
            ...record,
            custom_cover_url: showCreatorCovers
              ? record.custom_cover_url
              : null,
          })),
        );
        games.push(...answer.games);
        // Handed over on every page, so a large library fills in instead of
        // waiting for its last page.
        setLoaded({
          username,
          attempt,
          records: [...records],
          games: [...games],
          failed: false,
        });
        if (!answer.has_more) return;
      }
    })();

    return () => {
      listening = false;
    };
  }, [username, showCreatorCovers, attempt]);

  return (
    <LibraryData
      value={{
        records: current?.failed ? null : (current?.records ?? null),
        games: current?.games ?? [],
        failed: current?.failed ?? false,
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </LibraryData>
  );
}

/** The counters in the hero. */
export function LibraryStats({ lang }: { lang: UiLang }) {
  const { records } = useContext(LibraryData);
  if (!records) return null;
  return <LibraryLiveStats records={records} lang={lang} />;
}

/** The collection itself. */
export function LibraryBody({ lang, owner }: { lang: UiLang; owner: boolean }) {
  const { records, games, failed, retry } = useContext(LibraryData);

  if (failed)
    return (
      <LoadError
        lang={lang}
        onRetry={retry}
        what={tri(lang, "esta biblioteca", "this library", "esta biblioteca")}
      />
    );

  // The same drawing the route's skeleton used for this part of the page, so
  // the frame arriving does not swap one placeholder for a different one.
  if (!records) return <LibraryCollectionSkeleton />;

  // Rows but not one game to draw them with: the catalogue did not answer.
  // The collection would otherwise filter every row out and say there was
  // nothing to show, about a library that is full.
  if (records.length && !games.length)
    return (
      <LoadError
        lang={lang}
        onRetry={retry}
        what={tri(
          lang,
          "os jogos desta biblioteca",
          "the games in this library",
          "los juegos de esta biblioteca",
        )}
      />
    );

  return (
    <LibraryCollection
      games={games}
      records={records}
      lang={lang}
      owner={owner}
    />
  );
}
