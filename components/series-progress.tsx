import { getSeriesGames, type GameDetail } from "@/lib/igdb";
import { getLibraryCards } from "@/lib/library-state";
import { resolveGameCover } from "@/lib/game-cover";
import { seriesSlots, slotProgress } from "@/lib/series-policy";
import { serverApi, settleServer } from "@/lib/api-server";
import {
  SeriesProgressView,
  type SeriesSlotView,
} from "@/components/series-progress-view";
import { tri, type UiLang } from "@/lib/ui-text";
import { ServerReadError } from "@/components/ui/server-read-error";

/**
 * How far through a series somebody is.
 *
 * The count is the point, and the count is only honest if the series is the
 * games rather than every edition and port of them, and if a remake counts as
 * the game it remakes. Both of those are `lib/series-policy.ts`, which is
 * where the reasoning lives and where it is tested.
 *
 * Anything missing from IGDB's own series is missing here too, which is the
 * right failure: inventing the membership of a series is worse than not
 * drawing one.
 *
 * Signed out, it is still worth showing: the series is a fact about the game.
 * Only the marks on the covers need an account.
 *
 * All the reading happens here and the drawing happens in the client view
 * beside this file, because one thing on that strip is interactive: setting
 * an entry aside changes the denominator, both bars and which game comes
 * next, and none of that should wait for a round trip.
 */
export async function SeriesProgress({
  game,
  lang,
  signedIn,
}: {
  game: GameDetail;
  lang: UiLang;
  signedIn: boolean;
}) {
  if (!game.series) return null;
  // A reader with no library has nothing for an edition to satisfy, so the
  // second catalogue query is not asked for. Most game page traffic is
  // crawlers, and this is half of what the series costs them.
  const games = await getSeriesGames(game.series, signedIn);
  const slots = seriesSlots(games);
  // A series of one is the game you are already looking at.
  if (slots.length < 2) return null;

  // One read for the slots and every substitute of them: a remake somebody
  // played is in their library under its own id, not the base game's.
  //
  // Beside it, what this reader has set aside: theirs alone, and only asked
  // for when there is somebody to ask about, since a signed-out visitor has
  // no such list and the series is still worth drawing for them.
  const wanted = slots.flatMap((slot) => slot.satisfiedBy);
  const [saved, skipped] = signedIn
    ? await Promise.all([
        getLibraryCards(wanted),
        settleServer(
          serverApi.get<{ data: { igdb_id: number }[] }>("/library/ignored"),
        ),
      ])
    : [null, { data: null, error: null }];
  if (skipped.error)
    return (
      <ServerReadError
        lang={lang}
        what={tri(
          lang,
          "o progresso desta série",
          "this series' progress",
          "el progreso de esta serie",
        )}
      />
    );
  const holdings = new Map(
    (saved?.data ?? []).map((row) => [row.igdb_id, row]),
  );
  const byId = new Map(games.map((one) => [one.id, one]));

  // What the browser needs and nothing more: the states are worked out here,
  // where the library is, and the ids travel so the count can be redone there
  // when an entry is set aside.
  const view: SeriesSlotView[] = slots.map((slot) => {
    const { state, via } = slotProgress(slot, holdings);
    return {
      id: slot.game.id,
      slug: slot.game.slug,
      name: slot.game.name,
      cover: resolveGameCover(
        slot.game.coverUrl,
        holdings.get(slot.game.id)?.custom_cover_url ?? null,
      ),
      year: slot.game.releaseYear,
      state,
      via: via ? (byId.get(via)?.name ?? null) : null,
      satisfiedBy: slot.satisfiedBy,
    };
  });

  return (
    <SeriesProgressView
      seriesName={game.series.name}
      slots={view}
      currentId={game.id}
      ignored={(skipped.data?.data ?? []).map((row) => row.igdb_id)}
      signedIn={signedIn}
      lang={lang}
    />
  );
}
