import { scheduleMediaCleanup, rollbackMedia } from "@/lib/media-cleanup";
import {
  processUserImage,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_INPUT_BYTES,
  type ProcessedUserImage,
} from "@/lib/user-image";
import {
  uploadImage,
  squareBlobConfigured,
} from "@/lib/square-blob";
import { getMediaUrl } from "@/lib/media-url";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JOURNAL_IMAGE_LIMIT } from "@/lib/journal-entry";
import { ImageProcessingBusyError } from "@/lib/image-processing";
import { sameOrigin } from "@/lib/api/same-origin";
import { classifyPublishedImage } from "@/lib/server-image-screening";

export const runtime = "nodejs";

const acceptedTypes = IMAGE_MIME_TYPES;
const maxInputBytes = MAX_IMAGE_INPUT_BYTES;
const maxCaption = 200;
const uuid = /^[0-9a-f-]{36}$/i;
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
      url: getMediaUrl(row.image_url),
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

  if (!squareBlobConfigured())
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
  // failing before the upload keeps orphans off storage entirely.
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

  let optimized: ProcessedUserImage;
  try {
    optimized = await processUserImage(
      Buffer.from(await image.arrayBuffer()),
      "journal",
      image.type,
    );
  } catch {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }
  const processed = optimized.buffer;
  const { width, height } = optimized;

  let serverDetected: boolean;
  try {
    serverDetected = (await classifyPublishedImage(processed)).sensitive;
  } catch (error) {
    if (error instanceof ImageProcessingBusyError)
      return Response.json({ error: "busy" }, { status: 503 });
    return Response.json({ error: "screening_unavailable" }, { status: 503 });
  }
  if (serverDetected) {
    const { error } = await supabase.rpc("mark_diary_sensitive", {
      entry: entryId,
      value: true,
      detected: true,
    });
    if (error) {
      console.error("[journal-images] sensitive mark failed", error);
      return Response.json({ error: "screening_unavailable" }, { status: 503 });
    }
  }

  let uploaded;
  try {
    uploaded = await uploadImage(optimized, user.id, "journal");
  } catch {
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }
  const url = uploaded.key;
  const remoteId = null;

  const { data: created, error: insertError } = await createAdminClient()
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
    await rollbackMedia(uploaded.key, user.id);
    return Response.json({ error: "publish_failed" }, { status: 500 });
  }

  return Response.json(
    {
      id: created.id,
      url: getMediaUrl(url),
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
    .select("id,profile_id,image_url")
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
  scheduleMediaCleanup();
  return new Response(null, { status: 204 });
}
