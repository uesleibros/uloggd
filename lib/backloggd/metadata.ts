import type { BackloggdSourceGame } from "./parser";

export type BackloggdImportMetadata = {
  status: "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  quickRating: number | null;
};

export function mergeBackloggdSourceGame(
  previous: BackloggdSourceGame | undefined,
  game: BackloggdSourceGame,
): BackloggdSourceGame {
  if (!previous) return game;
  return {
    slug: game.slug,
    sourceName: previous.sourceName ?? game.sourceName,
    personalRating: previous.personalRating ?? game.personalRating,
    played: previous.played || game.played,
    playing: previous.playing || game.playing,
    backlog: previous.backlog || game.backlog,
    wishlist: previous.wishlist || game.wishlist,
  };
}

export function classifyBackloggdSourceGame(
  game: BackloggdSourceGame,
): BackloggdSourceGame {
  if (game.played || game.playing || game.backlog || game.wishlist) return game;
  // A public library item should belong to one of Backloggd's four collection
  // filters. If their markup ever omits it, a rating is evidence of play;
  // otherwise keep it in Backlog instead of creating an unclassified record.
  return game.personalRating !== null
    ? { ...game, played: true }
    : { ...game, backlog: true };
}

export function backloggdImportMetadata(
  game: BackloggdSourceGame,
): BackloggdImportMetadata {
  const status = game.played
    ? "COMPLETED"
    : game.playing
      ? "PLAYING"
      : game.wishlist && !game.backlog
        ? "WISHLIST"
        : "BACKLOG";
  return {
    status,
    playing: game.playing,
    backlog: game.backlog,
    wishlist: game.wishlist,
    quickRating: game.personalRating,
  };
}
