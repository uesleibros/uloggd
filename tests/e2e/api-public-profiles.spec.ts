import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
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
});
