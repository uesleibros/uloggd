import { rollbackMedia } from "@/lib/media-cleanup";
import {
  processUserImage,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_INPUT_BYTES,
  type ProcessedUserImage,
} from "@/lib/user-image";
import { uploadImage } from "@/lib/square-blob";
import { ownedCollection } from "@/lib/api/collection";
import { VISIBILITIES } from "@/lib/api/enums";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { classifyPublishedImage } from "@/lib/server-image-screening";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "screenshots.read",
  table: "screenshots",
  columns:
    "id, public_id, igdb_id, game_slug, description, image_url, width, height, contains_spoilers, sensitive, visibility, created_at, updated_at",
  also: "deleted_at is null",
  order: "created_at desc, id desc",
});

const ACCEPTED = IMAGE_MIME_TYPES;
const MAX_INPUT_BYTES = MAX_IMAGE_INPUT_BYTES;
const MAX_DESCRIPTION = 2200;
const PER_HOUR = 20;

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const POST = apiRoute({
  scope: "screenshots.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, identity, db }) => {
    if (
      !/^multipart\/form-data/.test(request.headers.get("content-type") ?? "")
    )
      throw new ApiFailure(
        "invalid_request",
        "Send multipart/form-data with the picture in `image`.",
      );

    const form = await request.formData().catch(() => null);
    if (!form) throw new ApiFailure("invalid_request", "That is not a form.");

    const image = form.get("image");
    const gameId = Number(field(form, "igdb_id"));
    const slug = field(form, "game_slug");
    const description = field(form, "description");
    const visibility = field(form, "visibility") || "PUBLIC";
    const spoilers = field(form, "contains_spoilers") === "true";
    const authorSensitive = field(form, "sensitive") === "true";

    if (!(image instanceof File) || image.size <= 0)
      throw new ApiFailure("invalid_request", "image is required.");
    if (!ACCEPTED.has(image.type))
      throw new ApiFailure(
        "invalid_request",
        "image must be a JPEG, PNG, AVIF, GIF or WebP.",
      );
    if (image.size > MAX_INPUT_BYTES)
      throw new ApiFailure("invalid_request", "image must be under 15 MB.");
    if (!Number.isSafeInteger(gameId) || gameId <= 0)
      throw new ApiFailure(
        "invalid_request",
        "igdb_id must be a whole number.",
      );
    if (!/^[a-z0-9-]{1,80}$/.test(slug))
      throw new ApiFailure("invalid_request", "game_slug must be a game slug.");
    if (description.length > MAX_DESCRIPTION)
      throw new ApiFailure(
        "invalid_request",
        `description must be at most ${MAX_DESCRIPTION} characters.`,
      );
    if (!VISIBILITIES.includes(visibility as (typeof VISIBILITIES)[number]))
      throw new ApiFailure(
        "invalid_request",
        `visibility must be one of ${VISIBILITIES.join(", ")}.`,
      );

    // The key's own allowance is counted in requests; this one is counted in
    // pictures, and it is the one that matters here, because a picture costs
    // processing and storage rather than a row. It is the website's ceiling,
    // applied to the same account from the other direction.
    const recent = await db(async (client) => {
      const { rows } = await client.query<{ count: string }>(
        `select count(*) as count from public.screenshots
          where profile_id = $1 and created_at >= now() - interval '1 hour'`,
        [identity.profileId],
      );
      return Number(rows[0]?.count ?? 0);
    });
    if (recent >= PER_HOUR)
      throw new ApiFailure(
        "rate_limited",
        `An account may publish ${PER_HOUR} pictures an hour.`,
        { retry_after: 3600 },
      );

    let optimized: ProcessedUserImage;
    try {
      optimized = await processUserImage(
        Buffer.from(await image.arrayBuffer()),
        "screenshot",
        image.type,
      );
    } catch {
      throw new ApiFailure(
        "invalid_request",
        "That image could not be processed.",
      );
    }
    const processed = optimized.buffer;
    const { width, height } = optimized;

    let serverDetected: boolean;
    try {
      serverDetected = (await classifyPublishedImage(processed)).sensitive;
    } catch {
      throw new ApiFailure(
        "internal",
        "Image screening is unavailable. Try again shortly.",
      );
    }

    const id = crypto.randomUUID();
    let uploaded;
    try {
      uploaded = await uploadImage(optimized, identity.profileId, "screenshot");
    } catch {
      throw new ApiFailure("internal", "The picture could not be stored.");
    }

    try {
      const { data: saved, error } = await createAdminClient()
        .from("screenshots")
        .insert({
          id,
          profile_id: identity.profileId,
          igdb_id: gameId,
          game_slug: slug,
          image_url: uploaded.key,
          remote_id: null,
          description: description || null,
          contains_spoilers: spoilers,
          sensitive: authorSensitive || serverDetected,
          sensitive_detected: serverDetected,
          visibility,
          width,
          height,
        })
        .select(
          "id,public_id,igdb_id,game_slug,image_url,description,contains_spoilers,sensitive,visibility,width,height,created_at",
        )
        .single();
      if (error || !saved)
        throw new ApiFailure("internal", "The picture could not be saved.");
      return { data: saved };
    } catch (error) {
      // The picture is already on the image host, and the row that would have
      // pointed at it does not exist. Leaving it there would be a file nothing
      // can reach and nothing will ever remove.
      await rollbackMedia(uploaded.key, identity.profileId);
      throw error;
    }
  },
});
