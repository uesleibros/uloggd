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

/**
 * How a group is keyed and named, per grouping.
 *
 * A platform's identity is its catalogue id; the name is presentation. Two
 * different platforms that happen to share a label are two groups, and one
 * platform recorded under two spellings is still one. A copy with a name and
 * no id falls back to the name, because that is all it has and dropping it
 * into "unset" beside genuinely blank rows would be a worse lie than keying
 * it on its label.
 */
export function copyGroupColumns(group: Exclude<CopyGroup, "none">): {
  key: string;
  label: string;
} {
  return group === "platform"
    ? {
        key: "coalesce(platform_id::text, platform_name)",
        label: "min(platform_name)",
      }
    : { key: group, label: "null::text" };
}

/**
 * Everything about a shelf that is a number rather than a row, in one read.
 *
 * Three answers, one statement, because they are all aggregates over the same
 * table and a round trip costs more than a CTE: the totals for the filtered
 * shelf, the facet counts that let somebody change their mind, and the size of
 * each group when the view is grouped.
 *
 * The three do not share a predicate, and that is deliberate:
 *
 * - **Totals** use exactly the filters the rows use. A screen showing
 *   twenty-two Steam copies must not say "of a hundred games": every number
 *   on it describes what is on it.
 * - **A facet** is counted with the other filters applied and its own
 *   ignored, so choosing a platform does not leave every other platform
 *   reading zero with no way back.
 * - **A group count** uses the same predicate as the rows, because it
 *   describes the result rather than offering a way out of it. Under
 *   `medium=PHYSICAL`, a Steam group of five physical copies says five, not
 *   the twenty-five Steam copies that exist.
 *
 * The caller passes the predicates, built once by its own filter code, so the
 * rows and the numbers can never drift apart on a difference of wording.
 */
export function copyAggregateSql(parts: {
  /** The predicate the rows themselves use. */
  filtered: string;
  /** Per facet, the same predicate minus that facet's own filter. */
  facets?: Record<"platform" | "medium" | "ownership" | "storefront", string>;
  /** The grouping the view asked for, if any. */
  group?: Exclude<CopyGroup, "none">;
}): string {
  const facet = (name: string, where: string, key: string, label: string) => `
    ${name} as (
      select ${key} as value, ${label} as label, count(*)::int as copies
        from public.library_entries
       where ${where} and ${key} is not null
       group by 1 order by copies desc, value asc limit 60
    )`;

  const tables = [
    `filtered as (
      select igdb_id, platform_id, platform_name, medium, ownership, storefront
        from public.library_entries where ${parts.filtered}
    )`,
    `per_game as (
      select igdb_id,
             count(*) as copies,
             -- A copy with no platform recorded is not a platform of its own:
             -- count(distinct) passes over the nulls, so "PS5 and one I never
             -- labelled" is one platform rather than two.
             count(distinct coalesce(platform_id::text, platform_name))
               as platforms
        from filtered group by igdb_id
    )`,
    `totals as (
      select (select count(*) from filtered)::int as copies,
             count(*)::int as games,
             count(*) filter (where copies > 1)::int
               as games_with_multiple_copies,
             count(*) filter (where platforms > 1)::int
               as games_on_multiple_platforms
        from per_game
    )`,
  ];

  if (parts.facets) {
    tables.push(
      facet(
        "f_platform",
        parts.facets.platform,
        "platform_id::text",
        "min(platform_name)",
      ),
      facet("f_medium", parts.facets.medium, "medium", "null::text"),
      facet("f_ownership", parts.facets.ownership, "ownership", "null::text"),
      facet(
        "f_storefront",
        parts.facets.storefront,
        "storefront",
        "null::text",
      ),
    );
  }
  if (parts.group) {
    const { key, label } = copyGroupColumns(parts.group);
    // Nulls are kept here, unlike in a facet: "no storefront recorded" is a
    // group the view draws, and a heading without a count under it is how a
    // page ends up lying about its own contents.
    tables.push(`grouped as (
      select ${key} as value, ${label} as label, count(*)::int as copies
        from filtered group by 1 order by copies desc, value asc nulls last
        limit 60
    )`);
  }

  const bundle = (name: string, table: string) =>
    `coalesce((select jsonb_agg(to_jsonb(one) order by one.copies desc)
                from ${table} one), '[]'::jsonb) as ${name}`;

  const selected = [
    "(select to_jsonb(t) from totals t) as totals",
    ...(parts.facets
      ? [
          bundle("platform", "f_platform"),
          bundle("medium", "f_medium"),
          bundle("ownership", "f_ownership"),
          bundle("storefront", "f_storefront"),
        ]
      : []),
    ...(parts.group ? [bundle("group_counts", "grouped")] : []),
  ];

  return `with ${tables.join(",\n")} select ${selected.join(",\n")}`;
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
