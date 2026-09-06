import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  issueApiKey,
  makePrivate,
  revokeApiKey,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * The public API answering real requests.
 *
 * The contract test in tests/unit holds the routes, the scopes and the
 * documentation to each other by reading them, which catches drift but proves
 * nothing about a request. This makes the requests: a real key, over the wire,
 * against the real database.
 *
 * Every account here is made by the spec and deleted afterwards, and the key
 * hangs off the profile, so cleanup is the same single call the other
 * signed-in specs use and cannot reach anybody else's rows.
 */
test.describe("api v1", () => {
  test.skip(
    !canSignIn,
    "needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and the publishable key",
  );
  // The allowances are per key but the database is shared, and each spec makes
  // an account, so these do not overlap.
  test.describe.configure({ mode: "serial" });

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  async function account(label: string) {
    const made = await createAccount(label);
    accounts.push(made);
    return made;
  }

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  test("a key says what it is and who it acts as", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apime");
    const key = await issueApiKey(owner, ["library.read"]);

    const response = await request.get("/api/v1/me", {
      headers: bearer(key.token),
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.key.id).toBe(key.id);
    expect(body.key.scopes).toEqual(["library.read"]);
    expect(body.owner.username).toBe(owner.username);
  });

  test("nothing but a live key is answered", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apibad");
    const key = await issueApiKey(owner, []);

    // Every way of presenting a wrong key answers alike on purpose, so a
    // token cannot be probed for which kind of wrong it is.
    const refusals = [
      { name: "not a key at all", headers: bearer("hello") },
      {
        name: "the right shape, unknown",
        headers: bearer(`ulg_live_${"0".repeat(32)}`),
      },
    ];
    for (const refusal of refusals) {
      const response = await request.get("/api/v1/me", {
        headers: refusal.headers,
      });
      expect(response.status(), refusal.name).toBe(401);
      expect((await response.json()).error.code, refusal.name).toBe(
        "invalid_key",
      );
    }

    // Carrying nothing at all is a different answer: it is what a browser
    // with no session sends, and calling that a bad key would name a key
    // nobody presented.
    const bare = await request.get("/api/v1/me", { headers: {} });
    expect(bare.status()).toBe(401);
    expect((await bare.json()).error.code).toBe("unauthorized");

    expect(
      (
        await request.get("/api/v1/me", { headers: bearer(key.token) })
      ).status(),
    ).toBe(200);
    await revokeApiKey(owner, key.id);
    const after = await request.get("/api/v1/me", {
      headers: bearer(key.token),
    });
    expect(after.status()).toBe(401);
    expect((await after.json()).error.code).toBe("invalid_key");
  });

  test("a scope the key does not hold is refused, and named", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apiscope");
    const key = await issueApiKey(owner, ["library.read"]);

    const response = await request.get("/api/v1/reviews", {
      headers: bearer(key.token),
    });
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error.code).toBe("insufficient_scope");
    expect(body.error.scope).toBe("reviews.read");

    // The one it does hold still works, so the refusal was the scope and not
    // the key.
    expect(
      (
        await request.get("/api/v1/library", { headers: bearer(key.token) })
      ).status(),
    ).toBe(200);
  });

  test("a key reads its owner's library and nobody else's", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const mine = await account("apimine");
    const theirs = await account("apitheirs");

    await giveLibrary(mine, [
      { game: 1, status: "PLAYING" },
      { game: 2, status: "BACKLOG" },
    ]);
    await giveLibrary(theirs, [
      { game: 3, status: "PLAYING" },
      { game: 4, status: "COMPLETED" },
      { game: 5, status: "BACKLOG" },
    ]);

    const key = await issueApiKey(mine, ["library.read"]);
    const response = await request.get("/api/v1/library", {
      headers: bearer(key.token),
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.page.total_items).toBe(2);
    expect(
      new Set(body.data.map((row: { igdb_id: number }) => row.igdb_id)),
    ).toEqual(new Set([900_001, 900_002]));
  });

  test("a write lands, and the read that follows sees it", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apiwrite");
    const key = await issueApiKey(owner, ["library.read", "library.write"]);

    const written = await request.post("/api/v1/library", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_007,
        game_slug: "e2e-game-7",
        status: "PLAYING",
        rating: 90,
      },
    });
    expect(written.status()).toBe(200);
    expect((await written.json()).data.status).toBe("PLAYING");

    const read = await request.get("/api/v1/library", {
      headers: bearer(key.token),
    });
    const rows = (await read.json()).data as {
      igdb_id: number;
      quick_rating: number | null;
    }[];
    const row = rows.find((one) => one.igdb_id === 900_007);
    expect(row).toBeTruthy();
    expect(row?.quick_rating).toBe(90);

    // And back out again, which is the half a write is not finished without.
    const gone = await request.delete("/api/v1/library/900007", {
      headers: bearer(key.token),
    });
    expect(gone.status()).toBe(200);
    const again = await request.delete("/api/v1/library/900007", {
      headers: bearer(key.token),
    });
    expect(again.status()).toBe(404);
    const empty = await request.get("/api/v1/library", {
      headers: bearer(key.token),
    });
    expect((await empty.json()).page.total_items).toBe(0);
  });

  test("a library entry is changed in place, and can be emptied", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    // The database takes covers from the catalog's own host and nowhere else,
    // so this is not a placeholder that could be any address.
    const COVER = "https://images.igdb.com/igdb/image/upload/t_cover_big/x.jpg";
    const owner = await account("apilib");
    const key = await issueApiKey(owner, ["library.read", "library.write"]);

    // PATCH needs the row to exist, because it reads the slug from it.
    const missing = await request.patch("/api/v1/library/900011", {
      headers: bearer(key.token),
      data: { status: "ON_HOLD" },
    });
    expect(missing.status()).toBe(404);

    await request.post("/api/v1/library", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_011,
        game_slug: "e2e-game-11",
        status: "PLAYING",
        rating: 70,
      },
    });

    // ON_HOLD is what the website calls "shelved". It was in the database and
    // in the interface, and refused by this route until now.
    const shelved = await request.patch("/api/v1/library/900011", {
      headers: bearer(key.token),
      data: { status: "ON_HOLD", cover_url: COVER },
    });
    expect(shelved.status(), await shelved.text()).toBe(200);
    const after = (await shelved.json()).data;
    expect(after.status).toBe("ON_HOLD");
    expect(after.custom_cover_url).toBe(COVER);
    expect(after.quick_rating).toBe(70);

    // Absent leaves a rating alone; null is the only way to say "none".
    const kept = await request.patch("/api/v1/library/900011", {
      headers: bearer(key.token),
      data: { liked: true },
    });
    expect((await kept.json()).data.quick_rating).toBe(70);

    const cleared = await request.patch("/api/v1/library/900011", {
      headers: bearer(key.token),
      data: { rating: null },
    });
    expect(cleared.status()).toBe(200);
    expect((await cleared.json()).data.quick_rating).toBeNull();

    const elsewhere = await request.patch("/api/v1/library/900011", {
      headers: bearer(key.token),
      data: { cover_url: "https://example.com/cover.png" },
    });
    expect(elsewhere.status()).toBe(400);

    const nothing = await request.patch("/api/v1/library/900011", {
      headers: bearer(key.token),
      data: {},
    });
    expect(nothing.status()).toBe(400);
  });

  test("a request that sends nothing to change is told what it may send", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apibody");
    const key = await issueApiKey(owner, ["library.write"]);

    const empty = await request.post("/api/v1/library", {
      headers: bearer(key.token),
      data: { igdb_id: 900_001, game_slug: "e2e-game-1" },
    });
    expect(empty.status()).toBe(400);
    expect((await empty.json()).error.message).toContain("status");

    // The quick rating is the one-to-ten scale stored ten times larger, so a
    // number in between is refused here rather than by the database.
    const offScale = await request.post("/api/v1/library", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_001,
        game_slug: "e2e-game-1",
        rating: 88,
      },
    });
    expect(offScale.status()).toBe(400);
    expect((await offScale.json()).error.message).toContain("multiple of 10");
  });

  test("a list item can be noted, moved and taken out", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apiitem");
    const key = await issueApiKey(owner, ["lists.read", "lists.write"]);

    const list = await request.post("/api/v1/lists", {
      headers: bearer(key.token),
      data: { name: "A list" },
    });
    const listId = (await list.json()).data.id as string;

    const added = await request.post(`/api/v1/lists/${listId}/items`, {
      headers: bearer(key.token),
      data: { igdb_id: 900_012, game_slug: "e2e-game-12" },
    });
    expect(added.status()).toBe(201);
    const itemId = (await added.json()).data.id as string;

    const noted = await request.patch(
      `/api/v1/lists/${listId}/items/${itemId}`,
      { headers: bearer(key.token), data: { note: "why it is here" } },
    );
    expect(noted.status()).toBe(200);
    expect((await noted.json()).data.note).toBe("why it is here");

    // Position and direction say the same thing two ways, so sending both is
    // a request that does not mean anything.
    const both = await request.patch(
      `/api/v1/lists/${listId}/items/${itemId}`,
      {
        headers: bearer(key.token),
        data: { position: 0, direction: "up" },
      },
    );
    expect(both.status()).toBe(400);

    const removed = await request.delete(
      `/api/v1/lists/${listId}/items/${itemId}`,
      { headers: bearer(key.token) },
    );
    expect(removed.status()).toBe(200);

    const missing = await request.delete(
      `/api/v1/lists/${listId}/items/${itemId}`,
      { headers: bearer(key.token) },
    );
    expect(missing.status()).toBe(404);
  });

  test("a picture has to be a picture, and arrive as a form", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apishot");
    const key = await issueApiKey(owner, ["screenshots.write"]);

    // Only the refusals, on purpose. A real upload re-encodes the image and
    // puts it on the image host, and a suite that did that on every run would
    // be publishing files to an outside service to prove a route works.
    const json = await request.post("/api/v1/screenshots", {
      headers: { ...bearer(key.token), "Content-Type": "application/json" },
      data: { igdb_id: 900_001 },
    });
    expect(json.status()).toBe(400);
    expect((await json.json()).error.message).toContain("multipart/form-data");

    const noImage = await request.post("/api/v1/screenshots", {
      headers: bearer(key.token),
      multipart: { igdb_id: "900001", game_slug: "e2e-game-1" },
    });
    expect(noImage.status()).toBe(400);
    expect((await noImage.json()).error.message).toContain("image is required");

    const notAnImage = await request.post("/api/v1/screenshots", {
      headers: bearer(key.token),
      multipart: {
        igdb_id: "900001",
        game_slug: "e2e-game-1",
        image: {
          name: "notes.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("this is not a picture"),
        },
      },
    });
    expect(notAnImage.status()).toBe(400);
    expect((await notAnImage.json()).error.message).toContain("JPEG");
  });

  test("following an account works, and a private one becomes a request", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const follower = await account("apifol");
    const open = await account("apiopen");
    const shut = await account("apishut");
    await makePrivate(shut);

    const key = await issueApiKey(follower, ["social.read", "social.write"]);

    // The success path, which is the one that was missing when this endpoint
    // shipped writing straight to the follows table: the database revokes that
    // insert precisely so a private account cannot be followed past its own
    // question, and nothing here tested more than the refusals.
    const followed = await request.put(
      `/api/v1/social/following/${open.username}`,
      { headers: bearer(key.token) },
    );
    expect(followed.status()).toBe(200);
    expect(await followed.json()).toMatchObject({
      data: { following: true, requested: false },
    });

    const asked = await request.put(
      `/api/v1/social/following/${shut.username}`,
      { headers: bearer(key.token) },
    );
    expect(asked.status()).toBe(200);
    expect(await asked.json()).toMatchObject({
      data: { following: false, requested: true },
    });

    const listed = await request.get("/api/v1/social/following", {
      headers: bearer(key.token),
    });
    expect((await listed.json()).page.total_items).toBe(1);

    await request.delete(`/api/v1/social/following/${open.username}`, {
      headers: bearer(key.token),
    });
    const empty = await request.get("/api/v1/social/following", {
      headers: bearer(key.token),
    });
    expect((await empty.json()).page.total_items).toBe(0);
  });

  test("a block is listed, and only in the direction that exists", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apiblock");
    const other = await account("apiother");
    const key = await issueApiKey(owner, ["social.read", "social.write"]);
    const otherKey = await issueApiKey(other, ["social.read"]);

    const blocked = await request.put(
      `/api/v1/social/blocks/${other.username}`,
      { headers: bearer(key.token) },
    );
    expect(blocked.status()).toBe(200);

    const mine = await request.get("/api/v1/social/blocks", {
      headers: bearer(key.token),
    });
    expect((await mine.json()).page.total_items).toBe(1);

    // The other side cannot see it. Being blocked is not a thing an account is
    // told, and no key changes that.
    const theirs = await request.get("/api/v1/social/blocks", {
      headers: bearer(otherKey.token),
    });
    expect((await theirs.json()).page.total_items).toBe(0);

    const itself = await request.put(
      `/api/v1/social/blocks/${owner.username}`,
      { headers: bearer(key.token) },
    );
    expect(itself.status()).toBe(400);

    const undone = await request.delete(
      `/api/v1/social/blocks/${other.username}`,
      { headers: bearer(key.token) },
    );
    expect(undone.status()).toBe(200);
    const cleared = await request.get("/api/v1/social/blocks", {
      headers: bearer(key.token),
    });
    expect((await cleared.json()).page.total_items).toBe(0);
  });

  test("the catalog answers a search and a single game", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apicat");
    const key = await issueApiKey(owner, ["catalog.read"]);

    const search = await request.get("/api/v1/games?q=e2e", {
      headers: bearer(key.token),
    });
    expect(search.status()).toBe(200);
    const found = await search.json();
    expect(found.page.size).toBe(24);
    expect(Array.isArray(found.data)).toBe(true);

    const one = await request.get("/api/v1/games/e2e-game-1", {
      headers: bearer(key.token),
    });
    expect(one.status()).toBe(200);
    expect((await one.json()).data.slug).toBe("e2e-game-1");

    // The same account, which has nothing, answering its own collections. An
    // empty page is an answer and not a missing one: a client that read 200
    // with nothing in it as a failure would break on every new account.
    const wider = await issueApiKey(owner, ["screenshots.read", "social.read"]);
    for (const path of ["/api/v1/screenshots", "/api/v1/social/followers"]) {
      const response = await request.get(path, {
        headers: bearer(wider.token),
      });
      expect(response.status(), path).toBe(200);
      const body = await response.json();
      expect(body.data, path).toEqual([]);
      expect(body.page.total_items, path).toBe(0);
      expect(body.page.has_more, path).toBe(false);
    }
  });

  test("a profile reads back what was written to it", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apiprof");
    const key = await issueApiKey(owner, ["profile.read", "profile.write"]);

    const before = await request.get("/api/v1/profile", {
      headers: bearer(key.token),
    });
    expect(before.status()).toBe(200);
    expect((await before.json()).data.username).toBe(owner.username);

    const changed = await request.patch("/api/v1/profile", {
      headers: bearer(key.token),
      data: { bio: "written by a key", pronouns: "they/them" },
    });
    expect(changed.status()).toBe(200);

    // The fields left out have to survive, because the function underneath
    // takes the whole set and would clear anything not sent back.
    const after = await request.get("/api/v1/profile", {
      headers: bearer(key.token),
    });
    const profile = (await after.json()).data;
    expect(profile.bio).toBe("written by a key");
    expect(profile.pronouns).toBe("they/them");
    expect(profile.display_name).toBe(`E2E apiprof`);
  });

  test("a list is made, read, renamed and removed", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apilist");
    const key = await issueApiKey(owner, ["lists.read", "lists.write"]);

    const made = await request.post("/api/v1/lists", {
      headers: bearer(key.token),
      data: { name: "Before", description: "a description" },
    });
    const list = (await made.json()).data;

    const listed = await request.get("/api/v1/lists", {
      headers: bearer(key.token),
    });
    expect((await listed.json()).page.total_items).toBe(1);

    // Reachable by its public id as well as its own, and carrying whether the
    // reader may write to it.
    const byPublicId = await request.get(`/api/v1/lists/${list.public_id}`, {
      headers: bearer(key.token),
    });
    expect(byPublicId.status()).toBe(200);
    const read = (await byPublicId.json()).data;
    expect(read.id).toBe(list.id);
    expect(read.owned).toBe(true);
    expect(read.items).toEqual([]);

    const renamed = await request.patch(`/api/v1/lists/${list.id}`, {
      headers: bearer(key.token),
      data: { name: "After" },
    });
    expect((await renamed.json()).data.name).toBe("After");
    // What was not sent keeps its value.
    expect(
      (
        await (
          await request.get(`/api/v1/lists/${list.id}`, {
            headers: bearer(key.token),
          })
        ).json()
      ).data.description,
    ).toBe("a description");

    const removed = await request.delete(`/api/v1/lists/${list.id}`, {
      headers: bearer(key.token),
    });
    expect(removed.status()).toBe(200);
    const gone = await request.get("/api/v1/lists", {
      headers: bearer(key.token),
    });
    expect((await gone.json()).page.total_items).toBe(0);
  });

  test("a session is logged, changed and removed", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apidiary");
    const key = await issueApiKey(owner, ["journal.read", "journal.write"]);

    const logged = await request.post("/api/v1/journal/entries", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_021,
        game_slug: "e2e-game-21",
        minutes: 45,
        note: "first sitting",
        played_on: "2026-01-04",
      },
    });
    expect(logged.status()).toBe(201);
    const entry = (await logged.json()).data;
    expect(entry.minutes).toBe(45);

    const listed = await request.get("/api/v1/journal/entries", {
      headers: bearer(key.token),
    });
    expect((await listed.json()).page.total_items).toBe(1);

    const changed = await request.patch(`/api/v1/journal/entries/${entry.id}`, {
      headers: bearer(key.token),
      data: { minutes: 90 },
    });
    expect(changed.status()).toBe(200);
    const after = (await changed.json()).data;
    expect(after.minutes).toBe(90);
    expect(after.note).toBe("first sitting");

    const removed = await request.delete(
      `/api/v1/journal/entries/${entry.id}`,
      { headers: bearer(key.token) },
    );
    expect(removed.status()).toBe(200);
    const gone = await request.get("/api/v1/journal/entries", {
      headers: bearer(key.token),
    });
    expect((await gone.json()).page.total_items).toBe(0);
  });

  test("a calendar of days, and the fields a session gained", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apidays");
    const key = await issueApiKey(owner, ["journal.read", "journal.write"]);

    const journey = await request.post("/api/v1/journal/journeys", {
      headers: bearer(key.token),
      data: { igdb_id: 900_013, game_slug: "e2e-game-13", title: "First run" },
    });
    const journeyId = (await journey.json()).data.id;

    const marked = await request.put("/api/v1/journal/days", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_013,
        game_slug: "e2e-game-13",
        days: ["2026-09-01", "2026-09-02"],
        journey_id: journeyId,
      },
    });
    expect(marked.status(), await marked.text()).toBe(200);
    expect((await marked.json()).data.added).toBe(2);

    // A day already covered is left alone rather than refused, so asking again
    // changes nothing and says so.
    const again = await request.put("/api/v1/journal/days", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_013,
        game_slug: "e2e-game-13",
        days: ["2026-09-01"],
        journey_id: journeyId,
      },
    });
    expect((await again.json()).data.added).toBe(0);

    const future = await request.put("/api/v1/journal/days", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_013,
        game_slug: "e2e-game-13",
        days: ["2999-01-01"],
      },
    });
    expect(future.status()).toBe(400);

    // A session carries a clock time and a journey now, and neither could be
    // set through this route before.
    const logged = await request.post("/api/v1/journal/entries", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_013,
        game_slug: "e2e-game-13",
        played_on: "2026-09-03",
        started_at: "21:30",
        minutes: 45,
        journey_id: journeyId,
        comments_scope: "NOBODY",
      },
    });
    expect(logged.status(), await logged.text()).toBe(201);
    const entry = (await logged.json()).data;
    expect(entry.started_at).toBe("21:30:00");
    expect(entry.journey_id).toBe(journeyId);

    const hidden = await request.patch(
      `/api/v1/journal/entries/${entry.id}`,
      {
        headers: bearer(key.token),
        data: { sensitive: true, started_at: "08:05:00" },
      },
    );
    expect(hidden.status(), await hidden.text()).toBe(200);
    const changed = (await hidden.json()).data;
    expect(changed.sensitive).toBe(true);
    expect(changed.started_at).toBe("08:05:00");
    expect(changed.comments_scope).toBe("NOBODY");

    const swept = await request.delete(
      `/api/v1/journal/days?igdb_id=900013&days=2026-09-01,2026-09-02&journey_id=${journeyId}`,
      { headers: bearer(key.token) },
    );
    expect(swept.status(), await swept.text()).toBe(200);
    expect((await swept.json()).data.removed).toBe(2);

    const left = await request.get("/api/v1/journal/entries", {
      headers: bearer(key.token),
    });
    const days = ((await left.json()).data as { played_on: string }[]).map(
      (one) => one.played_on,
    );
    expect(days).toEqual(["2026-09-03"]);
  });

  test("a journey is started, renamed and removed", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apijour");
    const key = await issueApiKey(owner, ["journal.read", "journal.write"]);

    const nameless = await request.post("/api/v1/journal/journeys", {
      headers: bearer(key.token),
      data: { igdb_id: 900_022, game_slug: "e2e-game-22" },
    });
    expect(nameless.status()).toBe(400);

    const started = await request.post("/api/v1/journal/journeys", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_022,
        game_slug: "e2e-game-22",
        title: "First run",
      },
    });
    expect(started.status()).toBe(201);
    const journey = (await started.json()).data;

    const listed = await request.get("/api/v1/journal/journeys", {
      headers: bearer(key.token),
    });
    expect((await listed.json()).page.total_items).toBe(1);

    const renamed = await request.patch(
      `/api/v1/journal/journeys/${journey.id}`,
      { headers: bearer(key.token), data: { title: "Second run" } },
    );
    expect((await renamed.json()).data.title).toBe("Second run");

    const removed = await request.delete(
      `/api/v1/journal/journeys/${journey.id}`,
      { headers: bearer(key.token) },
    );
    expect(removed.status()).toBe(200);
  });

  test("a review is written, changed, read and removed", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apirev");
    const key = await issueApiKey(owner, ["reviews.read", "reviews.write"]);

    const written = await request.post("/api/v1/reviews", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_023,
        game_slug: "e2e-game-23",
        title: "Before",
        content: "Some words about it.",
        rating: 90,
        rating_mode: "score_100",
      },
    });
    expect(written.status()).toBe(201);
    const review = (await written.json()).data;
    expect(review.rating).toBe(90);

    const listed = await request.get("/api/v1/reviews", {
      headers: bearer(key.token),
    });
    expect((await listed.json()).page.total_items).toBe(1);

    const changed = await request.patch(`/api/v1/reviews/${review.id}`, {
      headers: bearer(key.token),
      data: { title: "After" },
    });
    expect(changed.status()).toBe(200);
    const after = (await changed.json()).data;
    expect(after.title).toBe("After");
    // Everything not sent keeps its value, which is the whole point of the
    // read the update does before it writes.
    expect(after.content).toBe("Some words about it.");
    expect(after.rating).toBe(90);

    const removed = await request.delete(`/api/v1/reviews/${review.id}`, {
      headers: bearer(key.token),
    });
    expect(removed.status()).toBe(200);
    const gone = await request.get("/api/v1/reviews", {
      headers: bearer(key.token),
    });
    expect((await gone.json()).page.total_items).toBe(0);
  });

  test("a conversation, on a post and on a profile alike", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apitalk");
    const key = await issueApiKey(owner, [
      "reviews.write",
      "comments.read",
      "comments.write",
      "likes.write",
    ]);

    const review = await request.post("/api/v1/reviews", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_017,
        game_slug: "e2e-game-17",
        content: "Something to reply to.",
        rating: 80,
        rating_mode: "score_100",
      },
    });
    expect(review.status(), await review.text()).toBe(201);
    const reviewId = (await review.json()).data.id;

    const said = await request.post("/api/v1/comments", {
      headers: bearer(key.token),
      data: { on: "review", id: reviewId, body: "First." },
    });
    expect(said.status(), await said.text()).toBe(201);
    const commentId = (await said.json()).data.id;

    const reply = await request.post("/api/v1/comments", {
      headers: bearer(key.token),
      data: {
        on: "review",
        id: reviewId,
        body: "Answering myself.",
        parent_id: commentId,
      },
    });
    expect(reply.status(), await reply.text()).toBe(201);

    const listed = await request.get(
      `/api/v1/comments?on=review&id=${reviewId}`,
      { headers: bearer(key.token) },
    );
    expect(listed.status()).toBe(200);
    const rows = (await listed.json()).data as {
      id: string;
      body: string;
      parent_id: string | null;
    }[];
    expect(rows).toHaveLength(2);
    expect(rows[0].body).toBe("First.");
    expect(rows[1].parent_id).toBe(commentId);

    // The id alone is enough: the route finds which of the two tables it is in.
    const edited = await request.patch(`/api/v1/comments/${commentId}`, {
      headers: bearer(key.token),
      data: { body: "First, rewritten." },
    });
    expect(edited.status(), await edited.text()).toBe(200);
    expect((await edited.json()).data.body).toBe("First, rewritten.");

    const liked = await request.post("/api/v1/likes", {
      headers: bearer(key.token),
      data: { on: "content_comment", id: commentId },
    });
    expect(liked.status(), await liked.text()).toBe(200);
    expect((await liked.json()).data).toMatchObject({
      liked: true,
      like_count: 1,
    });

    // The same call turns it back over, which is the whole shape of it.
    const unliked = await request.post("/api/v1/likes", {
      headers: bearer(key.token),
      data: { on: "content_comment", id: commentId },
    });
    expect((await unliked.json()).data).toMatchObject({
      liked: false,
      like_count: 0,
    });

    // A reply under a profile is the same resource, addressed by name.
    const onProfile = await request.post("/api/v1/comments", {
      headers: bearer(key.token),
      data: { on: "profile", id: owner.username, body: "On my own wall." },
    });
    expect(onProfile.status(), await onProfile.text()).toBe(201);
    const wallId = (await onProfile.json()).data.id;

    const wall = await request.get(
      `/api/v1/comments?on=profile&id=${owner.username}`,
      { headers: bearer(key.token) },
    );
    expect((await wall.json()).data).toHaveLength(1);

    const goneWall = await request.delete(`/api/v1/comments/${wallId}`, {
      headers: bearer(key.token),
    });
    expect(goneWall.status()).toBe(200);
    const gone = await request.delete(`/api/v1/comments/${commentId}`, {
      headers: bearer(key.token),
    });
    expect(gone.status()).toBe(200);

    const missing = await request.delete(`/api/v1/comments/${commentId}`, {
      headers: bearer(key.token),
    });
    expect(missing.status()).toBe(404);
  });

  test("a report says it arrived and nothing else", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const reporter = await account("apiflag");
    const subject = await account("apiflagged");
    const key = await issueApiKey(reporter, ["social.write"]);

    const sent = await request.post("/api/v1/reports", {
      headers: bearer(key.token),
      data: {
        on: "PROFILE",
        username: subject.username,
        reason: "SPAM",
        details: "Posting the same thing everywhere.",
      },
    });
    expect(sent.status(), await sent.text()).toBe(201);
    expect((await sent.json()).data.received).toBe(true);

    // Anything that is not a profile has to say what it is about.
    const vague = await request.post("/api/v1/reports", {
      headers: bearer(key.token),
      data: { on: "LIST", username: subject.username, reason: "SPAM" },
    });
    expect(vague.status()).toBe(400);

    const itself = await request.post("/api/v1/reports", {
      headers: bearer(key.token),
      data: { on: "PROFILE", username: reporter.username, reason: "SPAM" },
    });
    expect(itself.status()).toBe(400);

    // There is no read side, on purpose.
    const peek = await request.get("/api/v1/reports", {
      headers: bearer(key.token),
    });
    expect(peek.status()).toBe(405);
  });

  test("a notification arrives resolved, with somewhere to go", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const author = await account("apinote");
    const reader = await account("apinoter");
    const authorKey = await issueApiKey(author, [
      "reviews.write",
      "profile.read",
      "profile.write",
    ]);
    const readerKey = await issueApiKey(reader, [
      "comments.write",
      "likes.write",
    ]);

    const review = await request.post("/api/v1/reviews", {
      headers: bearer(authorKey.token),
      data: {
        igdb_id: 900_029,
        game_slug: "e2e-game-29",
        content: "Worth replying to.",
        rating: 70,
        rating_mode: "score_100",
      },
    });
    const reviewId = (await review.json()).data.id;

    // Somebody else replies, which is what makes a notification exist.
    const said = await request.post("/api/v1/comments", {
      headers: bearer(readerKey.token),
      data: { on: "review", id: reviewId, body: "Replying." },
    });
    expect(said.status(), await said.text()).toBe(201);

    const inbox = await request.get("/api/v1/notifications", {
      headers: bearer(authorKey.token),
    });
    expect(inbox.status(), await inbox.text()).toBe(200);
    const body = await inbox.json();
    const rows = body.data as {
      id: string;
      kind: string;
      read_at: string | null;
      actor: { username: string } | null;
      path: string | null;
    }[];
    const item = rows.find((one) => one.kind === "post_comment");
    expect(item).toBeTruthy();
    expect(item?.actor?.username).toBe(reader.username);
    // Resolved, not a bare id: the address of the post plus the anchor.
    expect(item?.path).toMatch(/^review\/[^/]+#comment-[^/]+$/);
    expect(item?.read_at).toBeNull();

    const read = await request.patch(`/api/v1/notifications/${item!.id}`, {
      headers: bearer(authorKey.token),
    });
    expect(read.status(), await read.text()).toBe(200);
    const firstTime = (await read.json()).data.read_at;
    expect(firstTime).toBeTruthy();

    // Reading it again does not move the time it was read.
    const again = await request.patch(`/api/v1/notifications/${item!.id}`, {
      headers: bearer(authorKey.token),
    });
    expect((await again.json()).data.read_at).toBe(firstTime);

    const preferred = await request.patch(
      "/api/v1/notifications/preferences",
      {
        headers: bearer(authorKey.token),
        data: { comments_enabled: false },
      },
    );
    expect(preferred.status(), await preferred.text()).toBe(200);
    expect((await preferred.json()).data.comments_enabled).toBe(false);
    // The switches it was not told about keep what they had.
    expect((await preferred.json()).data.follows_enabled).toBe(true);

    const empty = await request.patch("/api/v1/notifications/preferences", {
      headers: bearer(authorKey.token),
      data: {},
    });
    expect(empty.status()).toBe(400);
  });

  test("every answer carries what is left of the allowance", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apirate");
    const key = await issueApiKey(owner, ["library.read"]);

    const seen: number[] = [];
    let reset = "";
    for (let call = 0; call < 3; call += 1) {
      const response = await request.get("/api/v1/library", {
        headers: bearer(key.token),
      });
      expect(response.status()).toBe(200);
      expect(response.headers()["x-ratelimit-limit"]).toBe("600");
      seen.push(Number(response.headers()["x-ratelimit-remaining"]));
      const at = response.headers()["x-ratelimit-reset"];
      // Anchored to the oldest call in the window, so it must not move away as
      // the caller keeps trying.
      if (reset) expect(at).toBe(reset);
      reset = at;
    }

    expect(seen).toEqual([599, 598, 597]);
  });
  test("a signed-in session is answered without a key", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apisess");
    const context = await browser.newContext();
    await signIn(context, owner);

    const mine = await context.request.get("/api/v1/me");
    expect(mine.status()).toBe(200);
    const body = await mine.json();
    // A session is the account itself, so there is no key to name.
    expect(body.key).toBeNull();
    expect(body.owner.username).toBe(owner.username);
    // And no key means no key allowance to report.
    expect(mine.headers()["x-ratelimit-limit"]).toBeUndefined();

    // A scope it never held, on a route a key would need one for.
    const library = await context.request.get("/api/v1/library");
    expect(library.status()).toBe(200);

    await context.close();
  });

  test("the account itself is out of reach of every key", async ({
    browser,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apiself");
    // Every scope there is, which is the point: none of them opens this.
    const key = await issueApiKey(owner, [
      "profile.read",
      "profile.write",
      "social.read",
      "social.write",
      "catalog.read",
    ]);

    for (const path of [
      "/api/v1/account/keys",
      "/api/v1/account/sessions",
      "/api/v1/account/identities",
      "/api/v1/account/export",
    ]) {
      const refused = await request.get(path, { headers: bearer(key.token) });
      expect(refused.status(), path).toBe(403);
      expect((await refused.json()).error.code, path).toBe("forbidden");
    }

    // The same person, signed in, is answered.
    const context = await browser.newContext();
    await signIn(context, owner);
    const mine = await context.request.get("/api/v1/account/keys");
    expect(mine.status()).toBe(200);
    expect(Array.isArray((await mine.json()).data)).toBe(true);
    await context.close();
  });

  test("a cookie is refused when the request came from somewhere else", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apicsrf");
    const context = await browser.newContext();
    await signIn(context, owner);

    const forged = await context.request.put("/api/v1/social/blocks/uloggd", {
      headers: { Origin: "https://not-uloggd.example" },
    });
    expect(forged.status()).toBe(401);
    expect((await forged.json()).error.code).toBe("unauthorized");

    await context.close();
  });
});
