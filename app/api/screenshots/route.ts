import { scheduleMediaCleanup, rollbackMedia } from "@/lib/media-cleanup";
import {
  processUserImage,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_INPUT_BYTES,
  type ProcessedUserImage,
} from "@/lib/user-image";
import { uploadImage } from "@/lib/square-blob";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VISIBILITIES } from "@/lib/api/enums";
import { isCommentScope } from "@/lib/comment-scope";
import type { Visibility } from "@/lib/visibility";
import { ImageProcessingBusyError } from "@/lib/image-processing";
import { sameOrigin } from "@/lib/api/same-origin";
import { classifyPublishedImage } from "@/lib/server-image-screening";

export const runtime = "nodejs";

const acceptedTypes = IMAGE_MIME_TYPES;
const maxInputBytes = MAX_IMAGE_INPUT_BYTES;
const maxDescription = 2200;

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
  const gameId = Number(input.get("gameId"));
  const gameSlug = String(input.get("gameSlug") ?? "").trim();
  const description = String(input.get("description") ?? "").trim();
  const visibility = String(input.get("visibility") ?? "PUBLIC");
  const spoilers = input.get("spoilers") === "true";
  const authorSensitive = input.get("sensitive") === "true";
  const browserDetected = input.get("sensitiveAuto") === "true";
  const commentsScope = String(input.get("commentsScope") ?? "EVERYONE");

  if (
    !(image instanceof File) ||
    !acceptedTypes.has(image.type) ||
    image.size <= 0 ||
    image.size > maxInputBytes ||
    !Number.isSafeInteger(gameId) ||
    gameId <= 0 ||
    !/^[a-z0-9-]{1,80}$/.test(gameSlug) ||
    description.length > maxDescription ||
    !VISIBILITIES.includes(visibility as Visibility) ||
    !isCommentScope(commentsScope)
  ) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("screenshots")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .gte("created_at", oneHourAgo);
  if (countError) {
    console.error("[screenshots] rate-limit query failed", countError);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
  if ((count ?? 0) >= 20)
    return Response.json({ error: "rate_limited" }, { status: 429 });

  let optimized: ProcessedUserImage;
  try {
    optimized = await processUserImage(
      Buffer.from(await image.arrayBuffer()),
      "screenshot",
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

  const id = crypto.randomUUID();
  let uploaded;
  try {
    uploaded = await uploadImage(optimized, user.id, "screenshot");
  } catch {
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }

  const { data: screenshot, error: insertError } = await createAdminClient()
    .from("screenshots")
    .insert({
      id,
      profile_id: user.id,
      igdb_id: gameId,
      game_slug: gameSlug,
      image_url: uploaded.key,
      remote_id: null,
      description: description || null,
      contains_spoilers: spoilers,
      sensitive: authorSensitive || browserDetected || serverDetected,
      sensitive_detected: browserDetected || serverDetected,
      visibility,
      comments_scope: commentsScope,
      width,
      height,
    })
    .select("public_id")
    .single();

  if (insertError || !screenshot) {
    console.error("[screenshots] database insert failed", insertError);
    await rollbackMedia(uploaded.key, user.id);
    return Response.json({ error: "publish_failed" }, { status: 500 });
  }
  return Response.json({ id: screenshot.public_id }, { status: 201 });
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
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return Response.json({ error: "invalid_input" }, { status: 400 });
  const { data: shot } = await supabase
    .from("screenshots")
    .select("id,profile_id,image_url")
    .eq("id", id)
    .maybeSingle();
  if (!shot || shot.profile_id !== user.id)
    return Response.json({ error: "not_found" }, { status: 404 });
  const { error: deleteError } = await supabase
    .from("screenshots")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);
  if (deleteError)
    return Response.json({ error: "delete_failed" }, { status: 500 });
  scheduleMediaCleanup();
  return new Response(null, { status: 204 });
}
