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

/**
 * The numbers, checked against rows somebody can count by hand.
 *
 * Every aggregate here is a `group by` over a join, which is the easiest
 * place in a codebase to count one thing twice: a run with ten sessions is
 * still one run, a copy used by two runs is still one copy, and a session
 * nobody is allowed to see is not in anybody else's total.
 */
test.describe("the numbers add up", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("three copies, three runs, and no double counting", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await createAccount("aggr");
    accounts.push(owner);
    const context = await browser.newContext();
    await signIn(context, owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);

    // Three copies of one game, said three different ways.
    const copies = [
      {
        platform_id: 167,
        platform_name: "PlayStation 5",
        medium: "DIGITAL",
        ownership: "OWNED",
        storefront: "PLAYSTATION",
      },
      {
        platform_id: 6,
        platform_name: "PC",
        medium: "DIGITAL",
        ownership: "OWNED",
        storefront: "STEAM",
      },
      {
        platform_id: 130,
        platform_name: "Nintendo Switch",
        medium: "PHYSICAL",
        ownership: "OWNED",
        storefront: "RETAIL",
      },
    ];
    const madeCopies: string[] = [];
    for (const copy of copies) {
      const made = await context.request.post("/api/v1/library/copies", {
        data: { igdb_id: 900_001, game_slug: "e2e-game-1", ...copy },
      });
      expect(made.status(), await made.text()).toBe(200);
      const body = await made.json();
      expect(body.created).toBe(true);
      madeCopies.push(body.data.id);
    }

    // Three runs. The middle one has several sessions and is still one run.
    const runs = await Promise.all([
      giveJourney(owner, {
        game: 1,
        title: "Primeira",
        sessions: [{ daysAgo: 30, minutes: 60 }],
      }),
      giveJourney(owner, {
        game: 1,
        title: "Segunda",
        sessions: [
          { daysAgo: 20, minutes: 30 },
          { daysAgo: 19, minutes: 30 },
          { daysAgo: 18, minutes: 30 },
        ],
      }),
      giveJourney(owner, {
        game: 1,
        title: "Terceira",
        sessions: [{ daysAgo: 5, minutes: 45 }],
      }),
    ]);

    const states = [
      { status: "COMPLETED", library_entry_id: madeCopies[0] },
      {
        status: "COMPLETED",
        replay: true,
        mastered: true,
        library_entry_id: madeCopies[1],
      },
      { status: "DROPPED" },
    ];
    for (let index = 0; index < runs.length; index += 1) {
      const saved = await context.request.patch(
        `/api/v1/journal/journeys/${runs[index].id}`,
        { data: states[index] },
      );
      expect(saved.status(), await saved.text()).toBe(200);
    }

    const answer = await context.request.get(
      `/api/v1/profiles/${owner.username}/stats`,
    );
    expect(answer.status()).toBe(200);
    const stats = (await answer.json()).data;

    // Copies: three of them, counted once each, in three different ways.
    expect(stats.totals.copies).toBe(3);
    const group = (rows: { value: string; copies: number }[]) =>
      Object.fromEntries(rows.map((row) => [row.value, row.copies]));
    expect(group(stats.copies.medium)).toEqual({ DIGITAL: 2, PHYSICAL: 1 });
    expect(group(stats.copies.ownership)).toEqual({ OWNED: 3 });
    expect(group(stats.copies.storefront)).toEqual({
      PLAYSTATION: 1,
      STEAM: 1,
      RETAIL: 1,
    });

    // Runs: three, whatever number of sessions each one holds.
    expect(stats.runs).toMatchObject({
      total: 3,
      completed: 2,
      dropped: 1,
      replays: 1,
      mastered: 1,
    });

    // Sessions and minutes come from the sessions, and the five of them add
    // up once: 60 + 30 + 30 + 30 + 45.
    expect(stats.totals.sessions).toBe(5);
    expect(stats.totals.minutes).toBe(195);
    expect(stats.totals.games).toBe(1);

    // And the platforms a run was played on are the copies it points at, one
    // row each rather than one row per session of it.
    const platforms = Object.fromEntries(
      stats.platforms.map((row: { platform: string; runs: number }) => [
        row.platform,
        row.runs,
      ]),
    );
    expect(platforms).toEqual({ "PlayStation 5": 1, PC: 1 });
    await context.close();
  });

  test("a private library tells a stranger nothing", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await createAccount("aggrpriv");
    const stranger = await createAccount("aggrnosy");
    accounts.push(owner, stranger);

    const ownerContext = await browser.newContext();
    await signIn(ownerContext, owner);
    for (const platform of [167, 6, 130]) {
      await ownerContext.request.post("/api/v1/library/copies", {
        data: {
          igdb_id: 900_001,
          game_slug: "e2e-game-1",
          platform_id: platform,
          medium: "DIGITAL",
          ownership: "SUBSCRIPTION",
          storefront: "STEAM",
        },
      });
    }
    const closed = await ownerContext.request.patch("/api/v1/profile", {
      data: { library_visibility: "PRIVATE" },
    });
    expect(closed.status(), await closed.text()).toBe(200);

    const mine = await (
      await ownerContext.request.get(`/api/v1/profiles/${owner.username}/stats`)
    ).json();
    expect(mine.data.totals.copies).toBe(3);
    await ownerContext.close();

    const strangerContext = await browser.newContext();
    await signIn(strangerContext, stranger);
    const theirs = await (
      await strangerContext.request.get(
        `/api/v1/profiles/${owner.username}/stats`,
      )
    ).json();
    // Not the rows, and not a count of them either: an aggregate is still a
    // fact about the rows it was made from.
    expect(theirs.data.totals.copies).toBe(0);
    expect(theirs.data.copies.medium).toEqual([]);
    expect(theirs.data.copies.ownership).toEqual([]);
    expect(theirs.data.copies.storefront).toEqual([]);
    expect(theirs.data.platforms).toEqual([]);
    await strangerContext.close();
  });
});
