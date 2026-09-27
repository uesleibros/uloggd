/**
 * Browsing a shelf of copies: the order, the page boundary and the filters.
 *
 * Pure, and without the `server-only` marker, so the decisions here can be
 * tested: a cursor that is not stable duplicates or drops rows, and that is
 * the kind of bug that only shows up on somebody's fourth page.
 */

export const COPY_SORTS = ["newest", "oldest", "title", "acquired"] as const;
export type CopySort = (typeof COPY_SORTS)[number];

export const COPY_GROUPS = [
  "none",
  "platform",
  "medium",
  "ownership",
  "storefront",
] as const;
export type CopyGroup = (typeof COPY_GROUPS)[number];

export type CopyCursor = { key: string | null; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The cursor is the sort key and the row's id, together.
 *
 * The id is what makes it stable. Two copies recorded in the same second have
 * the same `created_at`, and a cursor that carries only the timestamp either
 * returns one of them twice or skips the other, depending on which way the
 * comparison falls.
 */
export function encodeCopyCursor(cursor: CopyCursor): string {
  return Buffer.from(JSON.stringify([cursor.key, cursor.id]), "utf8").toString(
    "base64url",
  );
}

/** Nonsense decodes to nothing, which reads as "start from the beginning". */
export function decodeCopyCursor(raw: string | null): CopyCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    const [key, id] = parsed;
    if (typeof id !== "string" || !UUID.test(id)) return null;
    if (key !== null && typeof key !== "string") return null;
    return { key, id };
  } catch {
    return null;
  }
}

/** Which column a sort reads, for the cursor to carry its value. */
export function copySortKey(sort: CopySort) {
  return sort === "title"
    ? "game_slug"
    : sort === "acquired"
      ? "acquired_on"
      : "created_at";
}

/**
 * The `order by` for each sort, written whole rather than assembled.
 *
 * Every one of them ends in `id`, because an order without a tie-break is not
 * an order: rows with the same key come back in whatever order the plan
 * happens to produce, which changes between pages.
 *
 * `acquired` puts the undated last. Somebody who never recorded when they got
 * a copy is not somebody who got it first.
 */
export function copyOrderBy(sort: CopySort): string {
  switch (sort) {
    case "oldest":
      return "created_at asc, id asc";
    case "title":
      return "game_slug asc, id asc";
    case "acquired":
      return "acquired_on desc nulls last, id desc";
    default:
      return "created_at desc, id desc";
  }
}

/**
 * Where the next page starts, as SQL over two placeholders.
 *
 * `$key` is the cursor's key and `$id` its row, both as text; the caller
 * binds them. Written per sort rather than generated, because a keyset
 * comparison that does not match its own `order by` is a silent pagination
 * bug, and four short sentences are easier to check than one clever one.
 */
export function copyCursorClause(
  sort: CopySort,
  key: string,
  id: string,
): string {
  switch (sort) {
    case "oldest":
      return `(created_at, id) > (${key}::timestamptz, ${id}::uuid)`;
    case "title":
      return `(game_slug, id) > (${key}::text, ${id}::uuid)`;
    case "acquired":
      // Nulls last, so a row with no date is past every row with one, and the
      // undated ones are ordered between themselves by id.
      // Every mention is cast: an untyped placeholder inside `is null` gives
      // Postgres nothing to infer from, and it refuses the statement rather
      // than guessing.
      return `(
        (acquired_on is null) > (${key}::date is null)
        or (
          (acquired_on is null) = (${key}::date is null)
          and (
            (${key}::date is null and id < ${id}::uuid)
            or (${key}::date is not null
                and (acquired_on, id) < (${key}::date, ${id}::uuid))
          )
        )
      )`;
    default:
      return `(created_at, id) < (${key}::timestamptz, ${id}::uuid)`;
  }
}

export type CopyFacets = {
  platform: { value: string; copies: number }[];
  medium: { value: string; copies: number }[];
  ownership: { value: string; copies: number }[];
  storefront: { value: string; copies: number }[];
};

export type CopyRowish = {
  igdb_id: number;
  platform_id: number | null;
  platform_name: string | null;
};

/**
 * Two questions that look like one.
 *
 * "Games I have more than once" counts library entries. "Games I have on more
 * than one platform" counts distinct platforms. A person with two identical
 * PS5 discs of one game has the first and not the second, and calling the
 * first one "on more than one platform" is a sentence that is simply untrue.
 */
export function multipleCopyTotals(rows: CopyRowish[]) {
  const perGame = new Map<number, { copies: number; platforms: Set<string> }>();
  for (const row of rows) {
    const seen = perGame.get(row.igdb_id) ?? {
      copies: 0,
      platforms: new Set<string>(),
    };
    seen.copies += 1;
    const platform = row.platform_id
      ? String(row.platform_id)
      : (row.platform_name ?? "");
    if (platform) seen.platforms.add(platform);
    perGame.set(row.igdb_id, seen);
  }
  let multipleCopies = 0;
  let multiplePlatforms = 0;
  for (const seen of perGame.values()) {
    if (seen.copies > 1) multipleCopies += 1;
    if (seen.platforms.size > 1) multiplePlatforms += 1;
  }
  return {
    games: perGame.size,
    games_with_multiple_copies: multipleCopies,
    games_on_multiple_platforms: multiplePlatforms,
  };
}

/**
 * What somebody typed, as something the slug can be matched against.
 *
 * A copy carries `game_slug`, which is the title lowercased with dashes, so
 * "Resident Evil" finds `resident-evil-4` once the spaces become dashes.
 * Accents are folded for the same reason: nobody types "pokemon-espada" with
 * the accent the catalogue uses.
 */
export function copySearchTerm(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
