import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

test.describe("server screened profile pictures", () => {
  test.setTimeout(120_000);
  test.skip(
    !canSignIn || !process.env.IMGCHEST_API_KEY,
    "needs image upload keys",
  );

  test("a safe GIF remains animated after the compiled upload route", async ({
    context,
  }) => {
    const account = await createAccount("gif");
    let remoteId: string | null = null;
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );
    try {
      await signIn(context, account);
      const pixels = Buffer.alloc(64 * 128 * 3);
      pixels.fill(255, 0, 64 * 64 * 3);
      const gif = await sharp(pixels, {
        raw: { width: 64, height: 128, channels: 3, pageHeight: 64 },
      })
        .gif({ loop: 0, delay: [100, 250] })
        .toBuffer();
      const response = await context.request.post("/api/profile/image", {
        multipart: {
          kind: "avatar",
          image: { name: "safe.gif", mimeType: "image/gif", buffer: gif },
        },
      });
      expect(response.status(), await response.text()).toBe(200);
      const { url } = await response.json();
      const { data: history } = await admin
        .from("profile_image_history")
        .select("remote_id")
        .eq("profile_id", account.id)
        .eq("image_url", url)
        .single();
      remoteId = history?.remote_id ?? null;
      expect(remoteId).toBeTruthy();
      const image = await context.request.get(url);
      expect(image.ok()).toBe(true);
      const metadata = await sharp(await image.body()).metadata();
      expect(metadata.pages).toBe(2);
      expect(metadata.delay).toEqual([100, 250]);
      const reused = await context.request.patch("/api/profile/image", {
        data: { kind: "avatar", url },
      });
      expect(reused.status(), await reused.text()).toBe(200);
    } finally {
      // Only remove the post and account created by this test.
      try {
        const { data: history } = await admin
          .from("profile_image_history")
          .select("remote_id")
          .eq("profile_id", account.id);
        for (const id of new Set(
          [remoteId, ...(history ?? []).map((row) => row.remote_id)].filter(
            Boolean,
          ),
        )) {
          await fetch(`https://api.imgchest.com/v1/post/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.IMGCHEST_API_KEY}`,
            },
          });
        }
      } finally {
        await destroyAccount(account);
      }
    }
  });

  test("a safe avatar is screened, saved, reused, and removable", async ({
    context,
    page,
  }) => {
    const account: TestAccount = await createAccount("image");
    let remoteId: string | null = null;
    try {
      await signIn(context, account);
      const uploaded = await context.request.post("/api/profile/image", {
        multipart: {
          kind: "avatar",
          image: {
            name: "logo.jpg",
            mimeType: "image/jpeg",
            buffer: await readFile("public/logo.jpg"),
          },
        },
      });
      expect(uploaded.status(), await uploaded.text()).toBe(200);
      const { url } = (await uploaded.json()) as { url: string };
      expect(url).toMatch(/^https:\/\/(?:cdn\.)?imgchest\.com\//);

      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
      );
      const { data: profile } = await admin
        .from("profiles")
        .select("avatar_url")
        .eq("id", account.id)
        .single();
      expect(profile?.avatar_url).toBe(url);
      await page.goto(`/pt-BR/u/${account.username}`);
      await page.getByRole("button", { name: "Ver foto de perfil" }).click();
      const viewer = page.getByRole("dialog", { name: /Foto de/ });
      await expect(viewer).toBeVisible();
      await expect(viewer.getByText(`@${account.username}`)).toBeVisible();
      await viewer.getByRole("button", { name: "Ampliar imagem" }).click();
      await expect(viewer.locator(".media-lightbox-stage")).toHaveAttribute(
        "data-zoomed",
        "true",
      );
      await viewer.getByRole("button", { name: "Fechar" }).click();
      await expect(viewer).toBeHidden();
      const { data: history } = await admin
        .from("profile_image_history")
        .select("remote_id")
        .eq("profile_id", account.id)
        .eq("image_url", url)
        .single();
      remoteId = history?.remote_id ?? null;
      expect(remoteId).toBeTruthy();

      const reused = await context.request.patch("/api/profile/image", {
        data: { kind: "avatar", url },
      });
      expect(reused.status(), await reused.text()).toBe(200);
      const removed = await context.request.delete(
        "/api/profile/image?kind=avatar",
      );
      expect(removed.status(), await removed.text()).toBe(200);
    } finally {
      try {
        if (remoteId)
          await fetch(`https://api.imgchest.com/v1/post/${remoteId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.IMGCHEST_API_KEY}`,
            },
          });
      } finally {
        await destroyAccount(account);
      }
    }
  });
});
