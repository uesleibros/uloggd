/** Walk every page of several IGDB queries in batches, never a request per series. */
export async function readSeriesPages<T>(
  bodies: string[],
  query: (parts: { endpoint: string; body: string }[]) => Promise<T[][]>,
) {
  const result: T[][] = bodies.map(() => []);
  let pending = bodies.map((body, index) => ({ body, index, offset: 0 }));
  while (pending.length) {
    const answers = await query(
      pending.map(({ body, offset }) => ({
        endpoint: "games",
        body: `${body}\nsort id asc; limit 500; offset ${offset};`,
      })),
    );
    if (answers.length !== pending.length)
      throw new Error("Incomplete series catalogue answer");
    const next: typeof pending = [];
    pending.forEach((part, index) => {
      const rows = answers[index];
      result[part.index].push(...rows);
      if (rows.length === 500)
        next.push({ ...part, offset: part.offset + 500 });
    });
    pending = next;
  }
  return result;
}

export function seriesIdBatches(ids: number[]) {
  const safe = [...new Set(ids)]
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .sort((a, b) => a - b);
  return Array.from({ length: Math.ceil(safe.length / 100) }, (_, index) =>
    safe.slice(index * 100, (index + 1) * 100),
  );
}
