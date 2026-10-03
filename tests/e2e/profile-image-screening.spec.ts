import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
} from "./fixtures/account";
import { removeFixtureMedia } from "./fixtures/media";
import { mediaStorageKey } from "../../lib/media-url";
test.describe("server screened Square profile images", () => {
  test.skip(!canSignIn || !process.env.SQUARE_BLOB_ACCESS_KEY_ID);
  test.setTimeout(120000);
  for (const animated of [false, true])
    test(
      animated
        ? "GIF keeps its animation and history can reuse its immutable key"
        : "static avatar is AVIF and renders on the profile",
      async ({ context, page }) => {
        const account = await createAccount("blobavatar");
        let key: string | null = null;
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SECRET_KEY!,
        );
        try {
          await signIn(context, account);
          const pixels = Buffer.alloc(64 * 128 * 3);
          pixels.fill(255, 0, 64 * 64 * 3);
          const bytes = animated
            ? await sharp(pixels, {
                raw: { width: 64, height: 128, channels: 3, pageHeight: 64 },
              })
                .gif({ delay: [100, 250], loop: 2 })
                .toBuffer()
            : await readFile("public/logo.jpg");
          const response = await context.request.post("/api/profile/image", {
            multipart: {
              kind: "avatar",
              image: {
                name: animated ? "safe.gif" : "safe.jpg",
                mimeType: animated ? "image/gif" : "image/jpeg",
                buffer: bytes,
              },
            },
          });
          expect(response.status(), await response.text()).toBe(200);
          const { url } = await response.json();
          key = mediaStorageKey(url);
          expect(key).toBeTruthy();
          expect(key).toContain(`avatars/${account.id}/`);
          expect(key).toMatch(animated ? /\.webp$/ : /\.avif$/);
          const { data: history } = await admin
            .from("profile_image_history")
            .select("image_url,remote_id")
            .eq("profile_id", account.id)
            .single();
          expect(history?.image_url).toBe(key);
          expect(history?.remote_id).toBeNull();
          const image = await context.request.get(url);
          expect(image.ok()).toBe(true);
          const meta = await sharp(await image.body()).metadata();
          expect(meta.pages ?? 1).toBe(animated ? 2 : 1);
          if (animated) {
            expect(meta.delay).toEqual([100, 250]);
            expect(meta.loop).toBe(2);
          } else {
            expect(meta.compression).toBe("av1");
            await page.goto(`/pt-BR/u/${account.username}`);
            await page
              .getByRole("button", { name: "Ver foto de perfil" })
              .click();
            await expect(
              page.getByRole("dialog", { name: /Foto de/ }),
            ).toBeVisible();
          }
          const reuse = await context.request.patch("/api/profile/image", {
            data: { kind: "avatar", url },
          });
          expect(reuse.status(), await reuse.text()).toBe(200);
          const removed = await context.request.delete(
            "/api/profile/image?kind=avatar",
          );
          expect(removed.status(), await removed.text()).toBe(200);
        } finally {
          await destroyAccount(account);
          await removeFixtureMedia(key, account.id);
        }
      },
    );
});
