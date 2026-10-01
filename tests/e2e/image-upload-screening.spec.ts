import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveJourney,
  signIn,
} from "./fixtures/account";

test("screened screenshot and journal routes publish safe images", async ({
  context,
}) => {
  test.skip(!canSignIn || !process.env.IMGCHEST_API_KEY);
  test.setTimeout(180_000);
  const owner = await createAccount("screenuploads");
  const screenshotIds: string[] = [];
  let journalImageId: string | null = null;
  try {
    const journey = await giveJourney(owner, {
      game: 1,
      title: "Image screening run",
      sessions: [{ daysAgo: 1, note: "A safe image" }],
    });
    await signIn(context, owner);
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );
    const { data: entry } = await admin
      .from("diary_entries")
      .select("id")
      .eq("journey_id", journey.id)
      .single();
    expect(entry?.id).toBeTruthy();
    const image = await readFile("public/logo.jpg");
    const file = {
      name: "safe.jpg",
      mimeType: "image/jpeg",
      buffer: image,
    };

    const website = await context.request.post("/api/screenshots", {
      multipart: {
        gameId: "900001",
        gameSlug: "e2e-game-1",
        image: file,
      },
    });
    expect(website.status(), await website.text()).toBe(201);
    const websitePublicId = (await website.json()).id as string;
    const { data: websiteRow } = await admin
      .from("screenshots")
      .select("id,sensitive,sensitive_detected")
      .eq("public_id", websitePublicId)
      .single();
    expect(websiteRow?.sensitive).toBe(false);
    expect(websiteRow?.sensitive_detected).toBe(false);
    screenshotIds.push(websiteRow!.id);

    const api = await context.request.post("/api/v1/screenshots", {
      multipart: {
        igdb_id: "900001",
        game_slug: "e2e-game-1",
        image: {
          ...file,
          name: "tinted.png",
          mimeType: "image/png",
          buffer: await sharp(image).tint("#9e64da").png().toBuffer(),
        },
      },
    });
    expect(api.status(), await api.text()).toBe(201);
    const apiId = (await api.json()).data.id as string;
    screenshotIds.push(apiId);

    const journal = await context.request.post("/api/journal/images", {
      multipart: {
        entryId: entry!.id,
        image: {
          ...file,
          name: "blurred.png",
          mimeType: "image/png",
          buffer: await sharp(image).blur(3).png().toBuffer(),
        },
      },
    });
    expect(journal.status(), await journal.text()).toBe(201);
    journalImageId = (await journal.json()).id as string;
  } finally {
    if (journalImageId)
      await context.request.delete(`/api/journal/images?id=${journalImageId}`);
    for (const id of screenshotIds)
      await context.request.delete(`/api/screenshots?id=${id}`);
    await destroyAccount(owner);
  }
});
