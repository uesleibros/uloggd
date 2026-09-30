import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

const skip = hasDatabase ? false : "DIRECT_URL is not set";

test(
  "user image rows can only be created by screened server routes",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { username: "imageboundary" });
      const [entry] = await tx.query<{ id: string }>(
        `insert into public.diary_entries (profile_id, igdb_id, game_slug, played_on)
       values ($1, 911, 'image-boundary', current_date) returning id`,
        [owner],
      );
      const [image] = await tx.query<{ id: string }>(
        `insert into public.diary_entry_images
         (entry_id, profile_id, image_url, width, height)
       values ($1, $2, 'https://cdn.imgchest.com/files/boundary.webp', 800, 600)
       returning id`,
        [entry.id, owner],
      );

      await tx.become("authenticated", owner);
      const screenshot = await tx.attempt(
        `insert into public.screenshots
         (profile_id, igdb_id, game_slug, image_url, width, height)
       values (auth.uid(), 911, 'image-boundary',
               'https://cdn.imgchest.com/files/bypass.webp', 800, 600)`,
      );
      const journal = await tx.attempt(
        `insert into public.diary_entry_images
         (entry_id, profile_id, image_url, width, height)
       values ($1, auth.uid(), 'https://cdn.imgchest.com/files/bypass.webp', 800, 600)`,
        [entry.id],
      );
      const changed = await tx.attempt(
        `update public.diary_entry_images
          set image_url = 'https://cdn.imgchest.com/files/bypass.webp'
        where id = $1`,
        [image.id],
      );
      await tx.query("reset role");

      assert.equal(screenshot, "42501");
      assert.equal(journal, "42501");
      assert.equal(changed, "42501");
    });
  },
);
