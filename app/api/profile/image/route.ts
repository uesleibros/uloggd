import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sameOrigin } from "@/lib/api/same-origin";
import { ImageProcessingBusyError } from "@/lib/image-processing";
import { squareBlobConfigured, uploadImage } from "@/lib/square-blob";
import {
  mediaStorageKey,
  getMediaUrl,
  LEGACY_MEDIA_URL,
  ownsMedia,
} from "@/lib/media-url";
import { scheduleMediaCleanup, rollbackMedia } from "@/lib/media-cleanup";
import { downloadUserMedia } from "@/lib/media-download";
import {
  MAX_IMAGE_INPUT_BYTES,
  type ProcessedUserImage,
} from "@/lib/user-image";
import {
  InvalidProfileImageError,
  screenProfileImage,
} from "@/lib/server-image-screening";

export const runtime = "nodejs";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const maxBytes = MAX_IMAGE_INPUT_BYTES;

function isKind(
  value: FormDataEntryValue | null,
): value is "avatar" | "banner" {
  return value === "avatar" || value === "banner";
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
  const kind = input.get("kind");
  const image = input.get("image");
  if (!isKind(kind) || !(image instanceof File)) {
    return Response.json({ error: "invalid_upload" }, { status: 400 });
  }
  if (
    !allowedTypes.has(image.type) ||
    image.size <= 0 ||
    image.size > maxBytes
  ) {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }

  // Charge before decoding or inference so a caller cannot flood the model.
  const { data: waitFor, error: limitError } = await supabase.rpc(
    "claim_profile_image_change",
    { image_kind: kind === "avatar" ? "AVATAR" : "BANNER" },
  );
  if (limitError)
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  if ((waitFor ?? 0) > 0)
    return Response.json(
      { error: "rate_limited", retryAfter: waitFor },
      { status: 429, headers: { "Retry-After": String(waitFor) } },
    );

  let optimized: ProcessedUserImage;
  try {
    const screened = await screenProfileImage(
      Buffer.from(await image.arrayBuffer()),
      kind,
      image.type,
    );
    if (screened.verdict.sensitive)
      return Response.json({ error: "sensitive_image" }, { status: 422 });
    optimized = screened.image;
  } catch (error) {
    if (error instanceof InvalidProfileImageError)
      return Response.json({ error: "invalid_image" }, { status: 400 });
    if (error instanceof ImageProcessingBusyError)
      return Response.json({ error: "busy" }, { status: 503 });
    console.error("[profile-image] server screening failed", error);
    return Response.json({ error: "screening_unavailable" }, { status: 503 });
  }

  let uploaded;
  try {
    uploaded = await uploadImage(optimized, user.id, kind);
  } catch {
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }
  const { error } = await createAdminClient().rpc("replace_profile_media", {
    owner: user.id,
    kind,
    key: uploaded.key,
  });
  if (error) {
    await rollbackMedia(uploaded.key, user.id);
    return Response.json({ error: "profile_update_failed" }, { status: 500 });
  }
  scheduleMediaCleanup();
  return Response.json({ url: uploaded.url });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "avatar" && kind !== "banner") {
    return Response.json({ error: "invalid_kind" }, { status: 400 });
  }
  const { error } = await createAdminClient().rpc("replace_profile_media", {
    owner: user.id,
    kind,
    key: null,
  });
  if (error)
    return Response.json({ error: "profile_update_failed" }, { status: 500 });
  scheduleMediaCleanup();
  return Response.json({ url: null });
}

/**
 * Reapplies a picture the account has used before.
 *
 * Separate from POST because nothing is uploaded: the URL already exists and
 * is already in this account's history, which is what makes it safe to accept
 * from the client. Anything not in that history is refused, so this cannot be
 * used to point a profile at an arbitrary URL.
 */
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }
  const { kind, url } = (body ?? {}) as { kind?: string; url?: string };
  if ((kind !== "avatar" && kind !== "banner") || typeof url !== "string")
    return Response.json({ error: "invalid_input" }, { status: 400 });

  const { data: reuseWait, error: reuseLimitError } = await supabase.rpc(
    "claim_profile_image_change",
    { image_kind: kind === "avatar" ? "AVATAR" : "BANNER" },
  );
  if (reuseLimitError)
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  if ((reuseWait ?? 0) > 0)
    return Response.json(
      { error: "rate_limited", retryAfter: reuseWait },
      { status: 429, headers: { "Retry-After": String(reuseWait) } },
    );

  const reference = mediaStorageKey(url) ?? url;
  const { data: known } = await supabase
    .from("profile_image_history")
    .select("id,image_url")
    .eq("kind", kind === "avatar" ? "AVATAR" : "BANNER")
    .eq("image_url", reference)
    .maybeSingle();
  if (
    !known ||
    !(
      LEGACY_MEDIA_URL.test(known.image_url) ||
      (mediaStorageKey(known.image_url) && ownsMedia(known.image_url, user.id))
    )
  )
    return Response.json({ error: "not_found" }, { status: 404 });

  // History predates server screening. Recheck its bytes before reuse.
  try {
    const screened = await screenProfileImage(
      await downloadUserMedia(known.image_url),
      kind,
    );
    if (screened.verdict.sensitive)
      return Response.json({ error: "sensitive_image" }, { status: 422 });
  } catch (error) {
    if (error instanceof InvalidProfileImageError)
      return Response.json({ error: "invalid_image" }, { status: 400 });
    console.error("[profile-image] history screening failed", error);
    return Response.json({ error: "screening_unavailable" }, { status: 503 });
  }

  const { error } = await createAdminClient().rpc("replace_profile_media", {
    owner: user.id,
    kind,
    key: reference,
    reuse: true,
  });
  if (error)
    return Response.json({ error: "profile_update_failed" }, { status: 500 });
  scheduleMediaCleanup();
  return Response.json({ url: getMediaUrl(reference) });
}
