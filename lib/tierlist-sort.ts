import type { TierlistGame } from "@/lib/tierlists";

export type TierlistSortMode = "manual" | "az" | "za" | "newest" | "oldest";

export function sortTierlistGames(
  games: TierlistGame[],
  mode: TierlistSortMode,
  locale?: string,
) {
  const copy = [...games];
  if (mode === "az" || mode === "za") {
    const collator = new Intl.Collator(locale);
    copy.sort((a, b) =>
      mode === "az"
        ? collator.compare(a.name, b.name)
        : collator.compare(b.name, a.name),
    );
  } else if (mode === "newest" || mode === "oldest") {
    copy.sort((a, b) => {
      if (a.releaseTimestamp === null)
        return b.releaseTimestamp === null ? 0 : 1;
      if (b.releaseTimestamp === null) return -1;
      return mode === "newest"
        ? b.releaseTimestamp - a.releaseTimestamp
        : a.releaseTimestamp - b.releaseTimestamp;
    });
  }
  return copy;
}
