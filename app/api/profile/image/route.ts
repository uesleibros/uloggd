import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sameOrigin } from "@/lib/api/same-origin";
import { ImageProcessingBusyError } from "@/lib/image-processing";
import { imgchestConfigured, removeImage, uploadImage } from "@/lib/imgchest";
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
const maxBytes = 8 * 1024 * 1024;
const imgchestUrl = /^https:\/\/(?:cdn\.)?imgchest\.com\//i;

function isKind(
  value: FormDataEntryValue | null,
): value is "avatar" | "banner" {
  return value === "avatar" || value === "banner";
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png")
    return bytes
      .slice(0, 8)
      .every(
        (byte, index) =>
          byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
      );
  if (file.type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  if (file.type === "image/gif") {
    const header = String.fromCharCode(...bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (file.type === "image/avif") {
    return (
      String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
      ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
    );
  }
  return false;
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  if (!imgchestConfigured())
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
    image.size > maxBytes ||
    !(await hasValidSignature(image))
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

  let processed: Buffer;
  try {
    const screened = await screenProfileImage(
      Buffer.from(await image.arrayBuffer()),
      kind,
    );
    if (screened.verdict.sensitive)
      return Response.json({ error: "sensitive_image" }, { status: 422 });
    processed = screened.processed;
  } catch (error) {
    if (error instanceof InvalidProfileImageError)
      return Response.json({ error: "invalid_image" }, { status: 400 });
    if (error instanceof ImageProcessingBusyError)
      return Response.json({ error: "busy" }, { status: 503 });
    console.error("[profile-image] server screening failed", error);
    return Response.json({ error: "screening_unavailable" }, { status: 503 });
  }

  const uploaded = await uploadImage(processed, `${kind}-${user.id}.webp`);
  if (!uploaded)
    return Response.json({ error: "upload_failed" }, { status: 502 });

  const column = kind === "avatar" ? "avatar_url" : "banner_url";
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ [column]: uploaded.url })
    .eq("id", user.id);
  if (error) {
    await removeImage(uploaded.remoteId, "profile-image");
    return Response.json({ error: "profile_update_failed" }, { status: 500 });
  }

  // Remembered after the profile is updated, not before: a picture that failed
  // to become the profile's has no business in the history of ones that were.
  // A failure here costs a slot and nothing else, so it does not fail the
  // request someone is waiting on.
  const { error: historyError } = await supabase.rpc("remember_profile_image", {
    image_kind: kind === "avatar" ? "AVATAR" : "BANNER",
    url: uploaded.url,
    remote: uploaded.remoteId,
  });
  if (historyError)
    console.error("[profile-image] history write failed", historyError);

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
  const column = kind === "avatar" ? "avatar_url" : "banner_url";
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ [column]: null })
    .eq("id", user.id);
  if (error)
    return Response.json({ error: "profile_update_failed" }, { status: 500 });
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

  const { data: known } = await supabase
    .from("profile_image_history")
    .select("id,image_url")
    .eq("kind", kind === "avatar" ? "AVATAR" : "BANNER")
    .eq("image_url", url)
    .maybeSingle();
  if (!known || !imgchestUrl.test(known.image_url))
    return Response.json({ error: "not_found" }, { status: 404 });

  // History predates server screening. Recheck its bytes before reuse.
  try {
    const remote = await fetch(known.image_url, {
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!remote.ok || !remote.body)
      return Response.json({ error: "screening_unavailable" }, { status: 503 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = remote.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maxBytes)
          return Response.json({ error: "invalid_image" }, { status: 400 });
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const screened = await screenProfileImage(
      Buffer.concat(chunks, size),
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

  const column = kind === "avatar" ? "avatar_url" : "banner_url";
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ [column]: url })
    .eq("id", user.id);
  if (error)
    return Response.json({ error: "profile_update_failed" }, { status: 500 });

  // Moves it back to the front of the history, so the list stays ordered by
  // when each picture was last used rather than when it was first uploaded.
  await supabase.rpc("remember_profile_image", {
    image_kind: kind === "avatar" ? "AVATAR" : "BANNER",
    url,
  });
  return Response.json({ url });
}
