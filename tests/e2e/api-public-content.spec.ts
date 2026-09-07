import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveJourney,
  giveLibrary,
  giveScreenshot,
  signIn,
  type TestAccount,
} from "./fixtures/account";

test.describe("public content API", () => {
  test.skip(!canSignIn, "needs the Supabase test credentials");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
  });
  test("details preserve public visibility, galleries and owner editors", async ({
    context,
    request,
    page,
  }) => {
    test.setTimeout(120000);
    const owner = await createAccount("contentread");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    const journey = await giveJourney(owner, {
      game: 1,
      title: "API detail journey",
      sessions: [{ daysAgo: 1, minutes: 35, note: "API detail session" }],
    });
    await giveScreenshot(owner, { game: 1, description: "API detail capture" });
    await signIn(context, owner);
    const reviews: Record<string, { id: string; public_id: string }> = {};
    for (const visibility of ["PUBLIC", "PRIVATE"]) {
      const made = await context.request.post("/api/v1/reviews", {
        data: {
          igdb_id: visibility === "PUBLIC" ? 900001 : 900002,
          game_slug: visibility === "PUBLIC" ? "e2e-game-1" : "e2e-game-2",
          title: visibility + " detail review",
          rating:80,rating_mode:"score_100",
          content: "API detail review body",
          visibility,
        },
      });
      expect(made.status(), await made.text()).toBe(201);
      reviews[visibility] = (await made.json()).data;
    }
    async function read(path: string) {
      const response = await request.get(path);
      expect(response.status(), path + " " + (await response.text())).toBe(200);
      return response.json();
    }
    const review = await read("/api/v1/reviews/" + reviews.PUBLIC.public_id);
    expect(review.data.profiles.username).toBe(owner.username);
    expect(review.context.like.like_count).toBe(0);
    expect(
      (
        await request.get("/api/v1/reviews/" + reviews.PRIVATE.public_id)
      ).status(),
    ).toBe(404);
    expect(
      (
        await context.request.get("/api/v1/reviews/" + reviews.PRIVATE.id)
      ).status(),
    ).toBe(200);
    const journal = await read("/api/v1/journal/journeys/" + journey.public_id);
    expect(journal.public_sessions).toBe(1);
    const sessions = await read(
      "/api/v1/journal/journeys/" + journey.public_id + "/entries",
    );
    expect(sessions.summary[0].minutes).toBe(35);
    const entry = await read(
      "/api/v1/journal/entries/" + sessions.data[0].public_id,
    );
    expect(entry.data.note).toBe("API detail session");
    expect(entry.images).toEqual([]);
    const shots = await read(
      "/api/v1/profiles/" + owner.username + "/screenshots",
    );
    const shot = await read("/api/v1/screenshots/" + shots.data[0].public_id);
    expect(shot.data.description).toBe("API detail capture");
    const lists = [];
    for (const kind of ["COLLECTION", "TIERLIST"]) {
      const made = await context.request.post("/api/v1/lists", {
        data: { name: "API detail " + kind, kind },
      });
      expect(made.status(), await made.text()).toBe(201);
      const list = (await made.json()).data;
      lists.push(list);
      const detail = await read("/api/v1/lists/" + list.public_id);
      expect(detail.data.owned).toBe(false);
      if (kind === "TIERLIST")
        expect(
          (await read("/api/v1/lists/" + list.public_id + "/tiers")).data.items,
        ).toEqual([]);
    }
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
      .hostname;
    await context.route(
      (url) =>
        url.hostname === supabaseHost && !url.pathname.startsWith("/auth/v1/"),
      (route) => route.abort(),
    );
    for (const path of [
      "/review/" + reviews.PUBLIC.public_id,
      "/entry/" + entry.data.public_id,
      "/shot/" + shot.data.public_id,
      "/journal/" + journey.public_id,
      ...lists.flatMap((list) => [
        "/lists/" + list.public_id,
        "/lists/" + list.public_id + "?edit=1",
      ]),
    ]) {
      const response = await page.goto("/pt-BR" + path);
      expect(response?.status(), path).toBe(200);
      if(path.startsWith("/shot/")) await expect(page.locator("main").getByText("API detail capture",{exact:true})).toBeVisible();
      else await expect(page.locator("main h1").first()).toBeVisible();
    }
  });
});
