import { createClient } from "@/lib/supabase/server";
import { JOURNAL_IMAGE_LIMIT } from "@/lib/journal-entry";
import { acquireImageSlot, loadSharp } from "@/lib/image-processing";

export const runtime = "nodejs";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxInputBytes = 12 * 1024 * 1024;
const maxCaption = 200;
const uuid = /^[0-9a-f-]{36}$/i;
const imgchestUrl = /^https:\/\/(?:cdn\.)?imgchest\.com\//i;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

/**
 * Best-effort remote cleanup. One image per post, so removing the post removes
 * the image; a failure here leaves an orphan on imgchest but must not stop the
 * row from going away, or the gallery would keep showing a deleted image.
 */
async function removeRemote(remoteId: string | null) {
  const apiKey = process.env.IMGCHEST_API_KEY;
  if (!remoteId || !apiKey) return;
  try {
    await fetch(`https://api.imgchest.com/v1/post/${remoteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[journal-images] remote cleanup failed", {
      remoteId,
      error,
    });
  }
}

/** Ordered images for one entry. RLS decides whether the rows come back. */
export async function GET(request: Request) {
  const entryId = new URL(request.url).searchParams.get("entry");
  if (!entryId || !uuid.test(entryId))
    return Response.json({ error: "invalid_input" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diary_entry_images")
    .select("id,image_url,caption,width,height,position")
    .eq("entry_id", entryId)
    .order("position", { ascending: true })
    .limit(JOURNAL_IMAGE_LIMIT);
  if (error) {
    console.error("[journal-images] read failed", error);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
  return Response.json({
    images: (data ?? []).map((row) => ({
      id: row.id,
      url: row.image_url,
      width: row.width,
      height: row.height,
      caption: row.caption,
    })),
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

  const apiKey = process.env.IMGCHEST_API_KEY;
  if (!apiKey)
    return Response.json({ error: "upload_unavailable" }, { status: 503 });

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
  // failing before the upload keeps orphans off imgchest entirely.
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
  let releaseSlot: (() => void) | null = null;
  try {
    releaseSlot = await acquireImageSlot();
  } catch {
    return Response.json({ error: "busy" }, { status: 503 });
  }
  try {
    // Keep the native image processor out of route discovery/build workers;
    // it is loaded only for an authenticated upload request. It also gives the
    // dimensions, which the imgchest response does not carry.
    const sharp = await loadSharp();
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
  } finally {
    releaseSlot?.();
  }

  const upload = new FormData();
  upload.append(
    "images[]",
    new Blob([new Uint8Array(processed)], { type: "image/webp" }),
    `journal-${entryId}.webp`,
  );
  upload.append("privacy", "hidden");

  let response: Response;
  try {
    response = await fetch("https://api.imgchest.com/v1/post", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upload,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }
  if (!response.ok)
    return Response.json({ error: "upload_failed" }, { status: 502 });

  const payload = (await response.json()) as {
    data?: { id?: string; images?: Array<{ link?: string }> };
  };
  const url = payload.data?.images?.[0]?.link;
  const remoteId = payload.data?.id ?? null;
  if (!url || !imgchestUrl.test(url))
    return Response.json({ error: "upload_failed" }, { status: 502 });

  const { data: created, error: insertError } = await supabase
    .from("diary_entry_images")
    .insert({
      entry_id: entryId,
      profile_id: user.id,
      image_url: url,
      remote_id: remoteId,
      caption: caption || null,
      width,
      height,
      position,
    })
    .select("id")
    .single();
  if (insertError || !created) {
    console.error("[journal-images] database insert failed", insertError);
    await removeRemote(remoteId);
    return Response.json({ error: "publish_failed" }, { status: 500 });
  }

  return Response.json(
    {
      id: created.id,
      url,
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
    .select("id,profile_id,remote_id")
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
  await removeRemote(image.remote_id);
  return new Response(null, { status: 204 });
}
