import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  giveJourney,
  giveScreenshot,
  issueApiKey,
  signIn,
  type TestAccount,
} from "./fixtures/account";

test.describe("public profile reads", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(90_000);
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
  });

  test("anonymous reads work and keys still need their scope", async ({
    request,
  }) => {
    const owner = await createAccount("publicapi");
    accounts.push(owner);
    await giveLibrary(owner, [
      { game: 1, status: "PLAYING" },
      { game: 2, status: "COMPLETED" },
    ]);
    const base = `/api/v1/profiles/${owner.username}`;
    const profile = await request.get(base);
    expect(profile.status()).toBe(200);
    const body = await profile.json();
    expect(body.data.username).toBe(owner.username);
    for (const field of ["birth_date", "role", "email", "age_assurance_method"])
      expect(body.data).not.toHaveProperty(field);

    const first = await request.get(`${base}/library?limit=1`);
    expect(first.status()).toBe(200);
    const firstPage = await first.json();
    expect(firstPage.data).toHaveLength(1);
    expect(firstPage.has_more).toBe(true);
    const second = await (
      await request.get(`${base}/library?limit=1&page=2`)
    ).json();
    expect(second.data).toHaveLength(1);
    expect(second.data[0].igdb_id).not.toBe(firstPage.data[0].igdb_id);
    expect(second.has_more).toBe(false);
    for (const suffix of [
      "/summary",
      "/connections",
      "/minerals",
      `/year/${new Date().getUTCFullYear()}`,
    ])
      expect((await request.get(base + suffix)).status(), suffix).toBe(200);
    expect((await request.get(`${base}/library?limit=1.5`)).status()).toBe(400);
    expect((await request.get(`${base}/library?page=1001`)).status()).toBe(400);
    expect(
      (
        await request.get(base, {
          headers: { Authorization: "Bearer invalid" },
        })
      ).status(),
    ).toBe(401);
    const key = await issueApiKey(owner, ["profile.read"]);
    const headers = { Authorization: `Bearer ${key.token}` };
    expect((await request.get(base, { headers })).status()).toBe(200);
    expect((await request.get(`${base}/library`, { headers })).status()).toBe(
      403,
    );
  });

  test("RLS distinguishes the owner, followers and anonymous visitors", async ({
    context,
    browser,
    request,
  }) => {
    const owner = await createAccount("publicowner");
    const follower = await createAccount("publicfollow");
    accounts.push(owner, follower);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    const library = `/api/v1/profiles/${owner.username}/library`;
    const changed = await context.request.patch("/api/v1/profile", {
      data: { library_visibility: "FOLLOWERS" },
    });
    expect(changed.status()).toBe(200);
    // The standalone request fixture has no browser cookies.
    expect((await (await request.get(library)).json()).data).toEqual([]);
    expect(
      (await (await context.request.get(library)).json()).data,
    ).toHaveLength(1);
    const other = await browser.newContext({
      baseURL: "http://localhost:3100",
    });
    try {
      await signIn(other, follower);
      expect((await (await other.request.get(library)).json()).data).toEqual(
        [],
      );
      expect(
        (
          await other.request.put(`/api/v1/social/following/${owner.username}`)
        ).status(),
      ).toBe(200);
      expect(
        (await (await other.request.get(library)).json()).data,
      ).toHaveLength(1);
      expect(
        (
          await context.request.patch("/api/v1/profile", {
            data: { library_visibility: "PRIVATE" },
          })
        ).status(),
      ).toBe(200);
      expect((await (await other.request.get(library)).json()).data).toEqual(
        [],
      );
      expect(
        (await (await context.request.get(library)).json()).data,
      ).toHaveLength(1);
    } finally {
      await other.close();
    }
  });

  test("profile resources hydrate visible content and keep private content out", async ({
    context,
    request,
    page,
  }) => {
    const owner = await createAccount("publiccontent");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await giveJourney(owner, {
      game: 1,
      title: "API journey",
      sessions: [{ daysAgo: 1, minutes: 45, note: "Visible session" }],
    });
    await giveScreenshot(owner, {
      game: 1,
      description: "Visible capture 100%",
    });
    await giveScreenshot(owner, {
      game: 2,
      description: "Hidden capture",
      visibility: "PRIVATE",
    });
    await signIn(context, owner);
    for (const visibility of ["PUBLIC", "PRIVATE"]) {
      const created = await context.request.post("/api/v1/reviews", {
        data: {
          igdb_id: visibility === "PUBLIC" ? 900001 : 900002,
          game_slug: visibility === "PUBLIC" ? "e2e-game-1" : "e2e-game-2",
          title: `${visibility} review`,
          content: "API content",
          rating: 80,
          rating_mode: "score_100",
          visibility,
        },
      });
      expect(created.status(), await created.text()).toBe(201);
    }
    const made = await context.request.post("/api/v1/lists", {
      data: { name: "API collection" },
    });
    expect(made.status()).toBe(201);
    const list = (await made.json()).data;
    expect(
      (
        await context.request.post(`/api/v1/lists/${list.id}/items`, {
          data: { igdb_id: 900001, game_slug: "e2e-game-1" },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await context.request.post("/api/v1/comments", {
          data: {
            on: "profile",
            id: owner.username,
            body: "API profile conversation",
          },
        })
      ).status(),
    ).toBe(201);
    const base = `/api/v1/profiles/${owner.username}`;
    async function publicBody(path: string) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      return response.json();
    }
    const reviews = await publicBody(`${base}/reviews?kinds=review`);
    expect(reviews.data.map((entry: { title: string }) => entry.title)).toEqual(
      ["PUBLIC review"],
    );
    const gallery = await publicBody(`${base}/screenshots?q=100%25`);
    expect(gallery.total).toBe(1);
    expect(gallery.data[0].description).toBe("Visible capture 100%");
    const lists = await publicBody(`${base}/lists`);
    expect(lists.data[0].count).toBe(1);
    expect(lists.data[0].covers).toHaveLength(1);
    const social = await publicBody(`${base}/social`);
    expect(social.data.comments[0].body).toBe("API profile conversation");
    expect(social.data.viewer_wallet).toEqual([]);
    const activity = await publicBody(
      `/api/v1/activity?profile=${owner.id}&kinds=diary`,
    );
    expect(activity.data[0].minutes).toBe(45);
    expect(activity.data[0].journeyTitle).toBe("API journey");
    const logs = await publicBody(
      `/api/v1/games/e2e-game-1/activity?profile=${owner.id}&kinds=diary`,
    );
    expect(logs.minutes).toBe(45);
    expect(logs.days).toBe(1);
    for (const path of [
      `/pt-BR/u/${owner.username}`,
      `/pt-BR/lists/${owner.username}`,
      `/pt-BR/reviews/${owner.username}`,
      `/pt-BR/shots/${owner.username}`,
      "/pt-BR/game/e2e-game-1/logs",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("main h1").first()).toBeVisible();
    }
  });
});
