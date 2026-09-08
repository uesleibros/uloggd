import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  signIn,
  type TestAccount,
} from "./fixtures/account";
test.describe("site API reads", () => {
  test.skip(!canSignIn, "needs the Supabase test credentials");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
  });
  test("discovery, search and account reads support the website", async ({
    context,
    request,
    page,
  }) => {
    test.setTimeout(90000);
    const owner = await createAccount("apireads");
    accounts.push(owner);
    await giveLibrary(owner, [
      { game: 1, status: "PLAYING" },
      { game: 2, status: "BACKLOG" },
    ]);
    await signIn(context, owner);
    const collection = await context.request.post("/api/v1/lists", {
      data: { name: owner.username + " collection" },
    });
    expect(collection.status()).toBe(201);
    const review = await context.request.post("/api/v1/reviews", {
      data: {
        igdb_id: 900001,
        game_slug: "e2e-game-1",
        title: owner.username + " review",
        content: "API searchable review",
        rating: 80,
        rating_mode: "score_100",
      },
    });
    expect(review.status()).toBe(201);
    async function read(path: string, publicRead = false) {
      const response = await (publicRead ? request : context.request).get(path);
      expect(response.status(), path + " " + (await response.text())).toBe(200);
      return response.json();
    }
    expect(
      (
        await read(
          "/library/cards?ids=900001".replace("/library", "/api/v1/library"),
        )
      ).summary.library,
    ).toBe(2);
    expect(
      (await read("/api/v1/discovery/library")).data.continuing,
    ).toHaveLength(1);
    expect((await read("/api/v1/discovery/history")).data.forYou).toEqual([]);
    expect((await read("/api/v1/discovery/people")).data.friends).toEqual([]);
    const state = await read("/api/v1/account/state");
    expect(state.data.suspended).toBe(false);
    expect((await read("/api/v1/profile")).data).toHaveProperty(
      "username_changed_at",
    );
    const people = await read(
      "/api/v1/search/people?q=" + owner.username,
      true,
    );
    expect(people.data[0].username).toBe(owner.username);
    const lists = await read("/api/v1/search/lists?q=" + owner.username, true);
    expect(lists.data[0].name).toContain(owner.username);
    const reviews = await read(
      "/api/v1/search/reviews?q=" + owner.username,
      true,
    );
    expect(reviews.total).toBe(1);
    expect(reviews.data[0].title).toContain(owner.username);
    expect(
      (await read("/api/v1/reviews?game=900001&limit=20")).data,
    ).toHaveLength(1);
    expect((await read("/api/v1/reviews?game=900002&limit=20")).data).toEqual(
      [],
    );
    expect(
      (await request.get("/api/v1/library/cards?ids=900001")).status(),
    ).toBe(401);
    expect((await request.get("/api/v1/discovery/history")).status()).toBe(401);
    for (const path of [
      "/api/v1/search/people?page=0",
      "/api/v1/search/lists?kind=wrong",
      "/api/v1/search/reviews?sort=wrong",
    ])
      expect((await request.get(path)).status()).toBe(400);
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
      .hostname;
    await context.route(
      (url) =>
        url.hostname === supabaseHost && !url.pathname.startsWith("/auth/v1/"),
      (route) => route.abort(),
    );
    for (const path of [
      "/pt-BR",
      "/pt-BR/search?scope=people&q=" + owner.username,
      "/pt-BR/search?scope=lists&q=" + owner.username,
      "/pt-BR/search?scope=reviews&q=" + owner.username,
      "/pt-BR/game/e2e-game-1",
      "/pt-BR/settings",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
    }
  });
});
