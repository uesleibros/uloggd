import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  issueApiKey,
  revokeApiKey,
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

    // The four ways of being wrong answer alike on purpose, so a token cannot
    // be probed for which kind of wrong it is.
    const refusals = [
      { name: "no header", headers: {} },
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

  test("what goes into the library comes back out of it", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apidrop");
    const key = await issueApiKey(owner, ["library.read", "library.write"]);

    await request.post("/api/v1/library", {
      headers: bearer(key.token),
      data: { igdb_id: 900_011, game_slug: "e2e-game-11", status: "BACKLOG" },
    });

    const gone = await request.delete("/api/v1/library/900011", {
      headers: bearer(key.token),
    });
    expect(gone.status()).toBe(200);

    const again = await request.delete("/api/v1/library/900011", {
      headers: bearer(key.token),
    });
    expect(again.status()).toBe(404);

    const empty = await request.get("/api/v1/library", {
      headers: bearer(key.token),
    });
    expect((await empty.json()).page.total_items).toBe(0);
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

  test("a journey needs a name to start", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await account("apitrip");
    const key = await issueApiKey(owner, ["journal.read", "journal.write"]);

    const nameless = await request.post("/api/v1/journal/journeys", {
      headers: bearer(key.token),
      data: { igdb_id: 900_013, game_slug: "e2e-game-13" },
    });
    expect(nameless.status()).toBe(400);

    const started = await request.post("/api/v1/journal/journeys", {
      headers: bearer(key.token),
      data: {
        igdb_id: 900_013,
        game_slug: "e2e-game-13",
        title: "First run",
      },
    });
    expect(started.status()).toBe(201);
    expect((await started.json()).data.title).toBe("First run");
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
});
