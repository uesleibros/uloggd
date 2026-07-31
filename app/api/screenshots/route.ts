import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxInputBytes = 12 * 1024 * 1024;
const maxDescription = 2200;

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
    console.error("[screenshots] orphan cleanup failed", {
      storagePath,
      error,
      cleanupError,
    });
  }
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
  const gameId = Number(input.get("gameId"));
  const gameSlug = String(input.get("gameSlug") ?? "").trim();
  const description = String(input.get("description") ?? "").trim();
  const visibility = String(input.get("visibility") ?? "PUBLIC");
  const spoilers = input.get("spoilers") === "true";
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
    !["PUBLIC", "FOLLOWERS", "PRIVATE"].includes(visibility) ||
    !["EVERYONE", "FOLLOWERS", "NOBODY"].includes(commentsScope)
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
      metadata.width < 160 ||
      metadata.height < 160 ||
      !["jpeg", "png", "webp"].includes(metadata.format ?? "")
    ) {
      return Response.json({ error: "invalid_image" }, { status: 400 });
    }
    const output = await source
      .rotate()
      .resize({
        width: 2560,
        height: 2560,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    processed = output.data;
    width = output.info.width;
    height = output.info.height;
  } catch {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const storagePath = `${user.id}/${id}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("screenshots")
    .upload(storagePath, processed, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) {
    console.error("[screenshots] storage upload failed", uploadError);
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }

  const { data: screenshot, error: insertError } = await supabase
    .from("screenshots")
    .insert({
      id,
      profile_id: user.id,
      igdb_id: gameId,
      game_slug: gameSlug,
      storage_path: storagePath,
      description: description || null,
      contains_spoilers: spoilers,
      visibility,
      comments_scope: commentsScope,
      width,
      height,
    })
    .select("public_id")
    .single();

  if (insertError || !screenshot) {
    console.error("[screenshots] database insert failed", insertError);
    await removeUpload(storagePath, supabase);
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
    .select("id,profile_id,storage_path")
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
  await removeUpload(shot.storage_path, supabase);
  return new Response(null, { status: 204 });
}
