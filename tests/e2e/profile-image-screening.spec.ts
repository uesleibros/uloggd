import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

test.describe("server screened profile pictures", () => {
  test.skip(!canSignIn || !process.env.IMGCHEST_API_KEY, "needs image upload keys");

  test("a safe avatar is screened, saved, reused, and removable", async ({
    context,
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
