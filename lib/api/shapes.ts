import type { Game } from "@/lib/igdb";

export type PublicGame = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  cover_url: string;
  hero_url: string | null;
  release_year: number | null;
  rating: number | null;
  rating_count: number;
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
};

export function publicGame(game: Game): PublicGame {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    summary: game.summary,
    cover_url: game.coverUrl,
    hero_url: game.heroUrl,
    release_year: game.releaseYear,
    rating: game.rating,
    rating_count: game.ratingCount,
    genres: game.genres,
    platforms: game.platforms,
    developers: game.developers,
    publishers: game.publishers,
  };
}

export type Page = {
  number: number;
  size: number;
  total_items: number;
  total_pages: number;
  has_more: boolean;
};
