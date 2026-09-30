import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveJourney,
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
  test("quick search retains original covers and isolates personalization", async ({
    context,
    request,
  }) => {
    const owner = await createAccount("searchcover");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    const cover =
      "https://images.igdb.com/igdb/image/upload/t_cover_big/e2e-custom.jpg";
    const saved = await context.request.patch("/api/v1/library/900001", {
      data: { cover_url: cover },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    const path = "/api/igdb/search?ids=900001&scope=games";
    const personalized = await context.request.get(path);
    expect(personalized.status(), await personalized.text()).toBe(200);
    expect(personalized.headers()["cache-control"]).toBe("private, no-store");
    expect((await personalized.json()).results[0]).toMatchObject({
      id: 900001,
      coverUrl: cover,
      fallbackCoverUrl: "/logo.jpg",
      releaseTimestamp: null,
    });
    const anonymous = await request.get(path);
    expect(anonymous.status(), await anonymous.text()).toBe(200);
    expect((await anonymous.json()).results[0]).toMatchObject({
      coverUrl: "/logo.jpg",
      fallbackCoverUrl: "/logo.jpg",
    });
  });
  test("discovery, search and account reads support the website", async ({
    context,
    request,
    page,
  }) => {
    test.setTimeout(120000);
    const owner = await createAccount("apireads");
    accounts.push(owner);
    await giveLibrary(owner, [
      { game: 1, status: "PLAYING" },
      { game: 2, status: "BACKLOG" },
    ]);
    const journeyMarker = `journey${owner.username}`;
    const journey = await giveJourney(owner, {
      game: 1,
      title: journeyMarker,
      sessions: [{ daysAgo: 1, note: "A quiet session" }],
    });
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
        journey_id: journey.id,
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
    for (let attempt = 0; attempt < 2; attempt++) {
      const bootstrap = await context.request.post(
        "/api/v1/account/bootstrap",
        { data: { adopt_twitch: false } },
      );
      expect(bootstrap.status(), await bootstrap.text()).toBe(200);
      expect((await bootstrap.json()).data.username).toBe(owner.username);
    }
    expect(
      (await request.post("/api/v1/account/bootstrap", { data: {} })).status(),
    ).toBe(401);
    const state = await read("/api/v1/account/state");
    expect(state.data.suspended).toBe(false);
    // The suspension screen writes the appeal for the person, and the handle
    // is the one thing an appeal has to carry. It comes from here, because
    // that screen cannot open the profile to look it up.
    expect(state.data.username).toBe(owner.username);
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
    const journeyReviews = await read(
      "/api/v1/search/reviews?q=" + journeyMarker,
      true,
    );
    expect(journeyReviews.total).toBe(1);
    expect(journeyReviews.data[0].journeyId).toBe(journey.id);
    const journeyDiary = await read(
      "/api/v1/activity?kinds=diary&q=" + journeyMarker,
      true,
    );
    expect(journeyDiary.data).toHaveLength(1);
    expect(journeyDiary.data[0].journeyId).toBe(journey.id);
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
