/**
 * What counts as "the series", and what counts as having played one of it.
 *
 * Its own module, and without the `server-only` marker, so the policy can be
 * tested: it is a judgement rather than a fact, and the one in `lib/igdb.ts`
 * cannot be imported by a test because that file is server-only for good
 * reasons of its own.
 */

export type Series = {
  id: number;
  name: string;
  slug: string | null;
  kind: "collection" | "franchise";
};

export function seriesKey(series: Pick<Series, "id" | "kind">) {
  return `${series.kind}:${series.id}`;
}

type Listed = { id: number; name: string; slug?: string };

/**
 * A game can be in any number of collections and franchises, and IGDB nests
 * them: Breath of the Wild is in "The Legend of Zelda", which has thirty
 * games in it, and in "The Legend of Zelda: Breath of the Wild", which has
 * that game and its own editions. The first is a series somebody plays
 * through; the second is a shelf with one thing on it.
 *
 * The shortest name is the outer one, every time, because the inner ones are
 * named after the game they contain. So the shortest name wins, a franchise
 * is used only when there is no collection at all, and the caller drops a
 * series that turns out to hold fewer than two games.
 */
export function pickSeries(
  collections: Listed[] | undefined,
  franchises: Listed[] | undefined,
): Series | null {
  const named = (list: Listed[] | undefined) =>
    [...(list ?? [])]
      .filter((one) => one?.name)
      .sort((a, b) => a.name.length - b.name.length)[0] ?? null;
  const collection = named(collections);
  const franchise = named(franchises);
  const chosen = collection ?? franchise;
  if (!chosen) return null;
  return {
    id: chosen.id,
    name: chosen.name,
    slug: chosen.slug ?? null,
    kind: collection ? "collection" : "franchise",
  };
}

/** What IGDB says about one game's relations, as far as this policy cares. */
export type SeriesRow = {
  id: number;
  /** Games that are this one, made again. */
  remakes?: { id: number }[];
  remasters?: { id: number }[];
  /** The same game, elsewhere. */
  ports?: { id: number }[];
  /**
   * Editions and other versions of this row.
   *
   * IGDB states this on the version rather than on the parent: an edition
   * carries `version_parent`, and the parent carries nothing. Many editions
   * are also not main games, so they never appear in a series listing at
   * all. The reader asks for them separately and hands them over here.
   */
  versions?: { id: number }[];
  /** An edition, a bundle-of-one, a regional cut: the row it is a version of. */
  version_parent?: { id: number } | null;
  /** The game this one is content for. Never an equivalence, only a guard. */
  parent_game?: { id: number } | null;
};

export type SeriesSlot<T extends SeriesRow = SeriesRow> = {
  game: T;
  /**
   * Ids that count as having played this slot, the slot's own id first.
   *
   * A remake, a remaster, a port and an edition are the same game arriving
   * again. A sequel, a spinoff, a DLC and a standalone expansion are not,
   * whatever they share a name with.
   */
  satisfiedBy: number[];
};

/**
 * The games of a series, with each one's acceptable substitutes.
 *
 * Two problems, one pass:
 *
 * 1. **Double counting.** An edition or a port that IGDB also files as a main
 *    game shows up beside the game it is a version of, and a series of nine
 *    reads as eleven. A row that is a version, a remake, a remaster or a port
 *    of another row in the same list is folded into that row instead of
 *    standing beside it.
 *
 * 2. **False zeroes.** Somebody who played the remake of the first game has
 *    played the first game as far as a progress bar is concerned, and telling
 *    them they are at nought of three because they never marked a 1996 disc
 *    is wrong in the way that makes people stop trusting a number.
 *
 * The equivalence is deliberately narrow, and only ever from what IGDB
 * states: remake, remaster, port, version. A version is the awkward one,
 * because IGDB records it on the edition rather than on the game and most
 * editions are not main games, so a series listing never contains them: the
 * reader asks for them by parent and hands them in as `versions`. Nothing is inferred from a name, a
 * year or a shared franchise, because a wrong equivalence is worse than a
 * missing one: it tells somebody they have played something they have not.
 *
 * DLC and expansions are not substitutes in either direction. Playing the
 * expansion is not playing the game, and the base game does not stand in for
 * an expansion that happens to sit in the same collection.
 */
export function seriesSlots<T extends SeriesRow>(rows: T[]): SeriesSlot<T>[] {
  const present = new Map(rows.map((row) => [row.id, row]));
  const variants = new Map<number, number[]>();
  const folded = new Set<number>();

  for (const row of rows) {
    const substitutes = [
      ...(row.remakes ?? []),
      ...(row.remasters ?? []),
      ...(row.ports ?? []),
      ...(row.versions ?? []),
    ].map((one) => one.id);
    if (substitutes.length) variants.set(row.id, substitutes);
    // A row that is somebody else's variant does not get a slot of its own.
    for (const id of substitutes) if (present.has(id)) folded.add(id);
  }

  for (const row of rows) {
    const parent = row.version_parent?.id;
    if (parent && present.has(parent) && parent !== row.id) {
      folded.add(row.id);
      variants.set(parent, [...(variants.get(parent) ?? []), row.id]);
    }
    // Content for a game in this list is content, not the game. It is folded
    // away rather than becoming a slot nobody can finish separately.
    const base = row.parent_game?.id;
    if (base && present.has(base) && base !== row.id) folded.add(row.id);
  }

  return rows
    .filter((row) => !folded.has(row.id))
    .map((row) => ({
      game: row,
      satisfiedBy: [
        row.id,
        ...new Set((variants.get(row.id) ?? []).filter((id) => id !== row.id)),
      ],
    }));
}

export type SlotState = "finished" | "playing" | "started" | "library" | "none";

/** What a library row says about a game, in the order that matters most. */
export type SlotHolding = {
  igdb_id: number;
  status?: string | null;
  playing?: boolean | null;
  quick_rating?: number | null;
};

const RANK: Record<SlotState, number> = {
  finished: 4,
  playing: 3,
  started: 2,
  library: 1,
  none: 0,
};

function stateOf(holding: SlotHolding | undefined): SlotState {
  if (!holding) return "none";
  if (holding.status === "COMPLETED") return "finished";
  if (holding.playing || holding.status === "PLAYING") return "playing";
  if (holding.status === "DROPPED" || holding.status === "ON_HOLD")
    return "started";
  return "library";
}

/**
 * How far along one slot is, and which game answered for it.
 *
 * The slot's own row wins ties, so "finished, through Resident Evil" beats
 * "finished, through the remake" when both are marked. Otherwise the furthest
 * along wins: somebody who finished the remake and merely owns the original
 * has finished that slot.
 */
export function slotProgress(
  slot: SeriesSlot,
  holdings: Map<number, SlotHolding>,
): { state: SlotState; via: number | null } {
  let best: { state: SlotState; via: number | null } = {
    state: "none",
    via: null,
  };
  for (const id of slot.satisfiedBy) {
    const state = stateOf(holdings.get(id));
    if (state === "none") continue;
    const better = RANK[state] > RANK[best.state];
    const sameButOwn = RANK[state] === RANK[best.state] && id === slot.game.id;
    if (better || sameButOwn)
      best = { state, via: id === slot.game.id ? null : id };
  }
  return best;
}

/**
 * The two upstream answers, shaped into rows this policy can read.
 *
 * IGDB records the halves in opposite directions. A game carries its own
 * remakes, remasters and ports. An edition carries `version_parent`, and the
 * game it is an edition of carries nothing, so the editions arrive as a
 * separate list and are attached here.
 *
 * Pure on purpose: this is the seam between the catalogue and the policy, and
 * it is where a wrong field name or a missed direction would quietly cost
 * somebody a slot. The adapter calls it with what IGDB actually returns.
 */
export function seriesRowsFromIgdb<
  T extends {
    id: number;
    remakes?: { id: number }[];
    remasters?: { id: number }[];
    ports?: { id: number }[];
    version_parent?: { id: number } | null;
    parent_game?: { id: number } | null;
  },
>(
  games: T[],
  editions: { id: number; version_parent?: { id: number } | null }[],
) {
  const versionsOf = new Map<number, { id: number }[]>();
  for (const edition of editions) {
    const parent = edition.version_parent?.id;
    if (!parent || parent === edition.id) continue;
    versionsOf.set(parent, [
      ...(versionsOf.get(parent) ?? []),
      { id: edition.id },
    ]);
  }
  return games.map((game) => ({
    ...game,
    remakes: game.remakes?.map((one) => ({ id: one.id })),
    remasters: game.remasters?.map((one) => ({ id: one.id })),
    ports: game.ports?.map((one) => ({ id: one.id })),
    versions: versionsOf.get(game.id),
    version_parent: game.version_parent ?? null,
    parent_game: game.parent_game ?? null,
  }));
}
