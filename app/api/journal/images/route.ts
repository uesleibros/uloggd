import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JOURNAL_IMAGE_LIMIT } from "@/lib/journal-entry";

export const runtime = "nodejs";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxInputBytes = 12 * 1024 * 1024;
const maxCaption = 200;
const uuid = /^[0-9a-f-]{36}$/i;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

async function removeUpload(
  storagePath: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { error } = await supabase.storage
    .from("screenshots")
    .remove([storagePath]);
  if (!error) return;
  try {
    await createAdminClient().storage.from("screenshots").remove([storagePath]);
  } catch (cleanupError) {
    console.error("[journal-images] orphan cleanup failed", {
      storagePath,
      error,
      cleanupError,
    });
  }
}

/** Ordered images for one entry, signed for the caller RLS already approved. */
export async function GET(request: Request) {
  const entryId = new URL(request.url).searchParams.get("entry");
  if (!entryId || !uuid.test(entryId))
    return Response.json({ error: "invalid_input" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diary_entry_images")
    .select("id,storage_path,caption,width,height,position")
    .eq("entry_id", entryId)
    .order("position", { ascending: true })
    .limit(JOURNAL_IMAGE_LIMIT);
  if (error) {
    console.error("[journal-images] read failed", error);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
  const rows = data ?? [];
  if (!rows.length) return Response.json({ images: [] });

  const { data: signed } = await supabase.storage
    .from("screenshots")
    .createSignedUrls(
      rows.map((row) => String(row.storage_path)),
      3600,
    );
  const urlByPath = new Map(
    (signed ?? []).map((item) => [item.path, item.signedUrl]),
  );
  return Response.json({
    images: rows.flatMap((row) => {
      const url = urlByPath.get(String(row.storage_path));
      if (!url) return [];
      return [
        {
          id: row.id,
          url,
          width: row.width,
          height: row.height,
          caption: row.caption,
        },
      ];
    }),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "invalid_origin" }, { status: 403 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const input = await request.formData();
  const image = input.get("image");
  const entryId = String(input.get("entryId") ?? "");
  const caption = String(input.get("caption") ?? "").trim();

  if (
    !(image instanceof File) ||
    !acceptedTypes.has(image.type) ||
    image.size <= 0 ||
    image.size > maxInputBytes ||
    !uuid.test(entryId) ||
    caption.length > maxCaption
  ) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }

  // The entry must be the caller's own: RLS would reject the insert anyway, but
  // failing before the upload keeps orphan files out of storage entirely.
  const { data: entry } = await supabase
    .from("diary_entries")
    .select("id,profile_id")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry || entry.profile_id !== user.id)
    return Response.json({ error: "not_found" }, { status: 404 });

  const { data: existing, error: countError } = await supabase
    .from("diary_entry_images")
    .select("position")
    .eq("entry_id", entryId)
    .order("position", { ascending: false })
    .limit(JOURNAL_IMAGE_LIMIT);
  if (countError) {
    console.error("[journal-images] count failed", countError);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
  if ((existing ?? []).length >= JOURNAL_IMAGE_LIMIT)
    return Response.json({ error: "too_many_images" }, { status: 409 });
  const position = Math.min(
    JOURNAL_IMAGE_LIMIT - 1,
    (existing?.[0]?.position ?? -1) + 1,
  );

  let processed: Buffer;
  let width: number;
  let height: number;
  try {
    // Keep the native image processor out of route discovery/build workers;
    // it is loaded only for an authenticated upload request.
    const { default: sharp } = await import("sharp");
    const source = sharp(await image.arrayBuffer(), {
      failOn: "warning",
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    });
    const metadata = await source.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 80 ||
      metadata.height < 80 ||
      !["jpeg", "png", "webp"].includes(metadata.format ?? "")
    ) {
      return Response.json({ error: "invalid_image" }, { status: 400 });
    }
    const output = await source
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    processed = output.data;
    width = output.info.width;
    height = output.info.height;
  } catch {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const storagePath = `${user.id}/journal/${id}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("screenshots")
    .upload(storagePath, processed, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) {
    console.error("[journal-images] storage upload failed", uploadError);
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }

  const { error: insertError } = await supabase
    .from("diary_entry_images")
    .insert({
      id,
      entry_id: entryId,
      profile_id: user.id,
      storage_path: storagePath,
      caption: caption || null,
      width,
      height,
      position,
    });
  if (insertError) {
    console.error("[journal-images] database insert failed", insertError);
    await removeUpload(storagePath, supabase);
    return Response.json({ error: "publish_failed" }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("screenshots")
    .createSignedUrl(storagePath, 3600);
  return Response.json(
    {
      id,
      url: signed?.signedUrl ?? null,
      width,
      height,
      caption: caption || null,
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !uuid.test(id))
    return Response.json({ error: "invalid_input" }, { status: 400 });

  const { data: image } = await supabase
    .from("diary_entry_images")
    .select("id,profile_id,storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!image || image.profile_id !== user.id)
    return Response.json({ error: "not_found" }, { status: 404 });

  const { error: deleteError } = await supabase
    .from("diary_entry_images")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);
  if (deleteError)
    return Response.json({ error: "delete_failed" }, { status: 500 });
  await removeUpload(image.storage_path, supabase);
  return new Response(null, { status: 204 });
}
