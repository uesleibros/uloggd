import assert from "node:assert/strict";
import test from "node:test";
import {
  orderNeighbours,
  type NeighbourProfile,
  type RankedNeighbour,
} from "../../lib/taste-neighbours-order";

/**
 * The join between a ranking and the people it names.
 *
 * Worth its own tests because getting it wrong is invisible. The database
 * ranks the suggestions by how much two libraries actually overlap, and
 * fetching the profiles for those ids returns them in whatever order the
 * planner liked. A shelf built from the second list is sorted by nothing, and
 * still shows six plausible people, so nobody would notice from looking.
 */

const person = (id: string, extra: Partial<NeighbourProfile> = {}) => ({
  id,
  username: id,
  display_name: null,
  avatar_url: null,
  bio: null,
  verified: false,
  ...extra,
});

const ranked = (id: string, shared: number, back = false): RankedNeighbour => ({
  profile_id: id,
  shared_games: shared,
  follows_viewer: back,
});

test("the ranking's order survives the join", () => {
  const order = [ranked("carla", 30), ranked("ana", 12), ranked("bruno", 9)];
  // Deliberately alphabetical, which is the shape a database is most likely
  // to hand back and the one that looks least like a mistake.
  const profiles = [person("ana"), person("bruno"), person("carla")];

  const result = orderNeighbours(order, profiles);
  assert.deepEqual(
    result.map((entry) => entry.person.username),
    ["carla", "ana", "bruno"],
    "the shelf must follow the ranking, not the profile fetch",
  );
  assert.deepEqual(
    result.map((entry) => entry.sharedGames),
    [30, 12, 9],
  );
});

test("a suggestion with nowhere to go is dropped", () => {
  const order = [ranked("ana", 10), ranked("ghost", 8), ranked("bruno", 5)];
  const profiles = [
    person("ana"),
    // Half-registered: a row exists, a username does not, so there is no
    // profile page behind the card.
    person("ghost", { username: null }),
    person("bruno"),
  ];

  const result = orderNeighbours(order, profiles);
  assert.deepEqual(
    result.map((entry) => entry.person.username),
    ["ana", "bruno"],
  );
});

test("a ranked id with no profile row at all is dropped", () => {
  // The two reads are separate, so an account deleted between them comes back
  // ranked and unfetchable. Dropping beats drawing a card with no name.
  const result = orderNeighbours([ranked("vanished", 40)], []);
  assert.deepEqual(result, []);
});

test("what the card is told about the relationship", () => {
  const result = orderNeighbours(
    [ranked("ana", 10, true), ranked("bruno", 6, false)],
    [person("ana"), person("bruno")],
  );
  // Never already followed: the query exists to return people the viewer does
  // not follow, so a `true` here would mean the filter had stopped working.
  assert.equal(
    result.every((entry) => entry.person.viewer_follows === false),
    true,
  );
  assert.equal(result[0].person.follows_viewer, true, "this one found you");
  assert.equal(result[1].person.follows_viewer, false);
});
