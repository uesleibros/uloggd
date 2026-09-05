import { removeImage, uploadImage } from "@/lib/imgchest";
import { acquireImageSlot, loadSharp } from "@/lib/image-processing";
import { ownedCollection } from "@/lib/api/collection";
import { VISIBILITIES } from "@/lib/api/enums";
import { ApiFailure, apiRoute } from "@/lib/api/route";

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

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
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
    const sensitive = field(form, "sensitive") === "true";

    if (!(image instanceof File) || image.size <= 0)
      throw new ApiFailure("invalid_request", "image is required.");
    if (!ACCEPTED.has(image.type))
      throw new ApiFailure(
        "invalid_request",
        "image must be a JPEG, PNG or WebP.",
      );
    if (image.size > MAX_INPUT_BYTES)
      throw new ApiFailure("invalid_request", "image must be under 12 MB.");
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

    let processed: Buffer;
    let width: number;
    let height: number;
    let release: (() => void) | null = null;
    try {
      release = await acquireImageSlot();
    } catch {
      throw new ApiFailure(
        "internal",
        "The image processor is busy. Try again shortly.",
      );
    }
    try {
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
        metadata.width < 160 ||
        metadata.height < 160 ||
        !["jpeg", "png", "webp"].includes(metadata.format ?? "")
      )
        throw new ApiFailure(
          "invalid_request",
          "image must be at least 160 by 160, and really be a JPEG, PNG or WebP.",
        );
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
    } catch (error) {
      if (error instanceof ApiFailure) throw error;
      throw new ApiFailure("invalid_request", "That image could not be read.");
    } finally {
      release?.();
    }

    const id = crypto.randomUUID();
    const uploaded = await uploadImage(processed, `shot-${id}.webp`);
    if (!uploaded)
      throw new ApiFailure("internal", "The picture could not be stored.");

    try {
      const saved = await db(async (client) => {
        const { rows } = await client.query(
          `insert into public.screenshots
             (id, profile_id, igdb_id, game_slug, image_url, remote_id,
              description, contains_spoilers, sensitive, visibility,
              width, height)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::public."Visibility",
                   $11, $12)
           returning id, public_id, igdb_id, game_slug, image_url, description,
                     contains_spoilers, sensitive, visibility, width, height,
                     created_at`,
          [
            id,
            identity.profileId,
            gameId,
            slug,
            uploaded.url,
            uploaded.remoteId,
            description || null,
            spoilers,
            sensitive,
            visibility,
            width,
            height,
          ],
        );
        return rows[0];
      });
      return { data: saved };
    } catch (error) {
      // The picture is already on the image host, and the row that would have
      // pointed at it does not exist. Leaving it there would be a file nothing
      // can reach and nothing will ever remove.
      await removeImage(uploaded.remoteId, "screenshots");
      throw error;
    }
  },
});
