# User images on Square Cloud Blob

New avatar, banner, screenshot and journal uploads use the S3-compatible Square Cloud endpoint. ImgChest has no upload/delete client or credentials in the application. Existing ImgChest URLs remain readable until the backfill is complete. Identity-provider avatars and external catalogue artwork are unaffected.

## Pipeline

The authenticated route checks ownership, request size and rate limits before expensive work. `lib/user-image.ts` validates actual decoded bytes and any claimed MIME, applies EXIF rotation to still images, resizes without enlargement, converts to sRGB, strips private metadata and produces only static AVIF or animated WebP. `lib/server-image-screening.ts` checks the exact published bytes; avatar/banner content is refused when sensitive, while screenshots/journal images retain their existing sensitive-content flags. No originals or separate thumbnails are stored.

Only one encoding/inference slot runs per worker by default (`IMAGE_PROCESSING_CONCURRENCY=1`, `SHARP_CONCURRENCY=2`, bounded queue). The resized raw pixels are reused across at most four static quality attempts or three animated attempts. Already-small output is encoded once.

| Kind | Maximum dimensions | Static target | Static hard limit | Animation hard limit/duration |
| --- | --- | --- | --- | --- |
| Avatar | 512 × 512 | 100 KiB | 500 KiB | 4 MiB / 15 seconds |
| Banner | 1600 × 600 | 320 KiB | 1 MiB | 6 MiB / 20 seconds |
| Screenshot/journal | 1920 × 1080, fit inside | 650 KiB | 2 MiB | Not accepted |

Every source is limited to 15 MiB, 40 million aggregate decoded pixels and 300 frames. Output targets guide encoding; the separate hard limit is mandatory. Pixel art is never enlarged. Static AVIF uses quality 58 → 54 → 50 → 46, effort 3, 4:4:4 chroma. Animated WebP uses quality 82 → 78 → 75, effort 4, alpha quality 100 and smart chroma sampling. Alpha is retained. Animation comes from real `pages`, `pageHeight`, `delay` and `loop` metadata; the output frame count/timing/loop are checked before upload. Unsupported APNG/AVIF sequences are refused rather than silently frozen. Animated WebP and GIF bypass the browser crop canvas; static crop behavior remains available.

Sharp's [output API](https://sharp.pixelplumbing.com/api-output/) documents that AVIF sequences are unsupported and exposes the WebP timing/loop options. [Input metadata](https://sharp.pixelplumbing.com/api-input/) provides the decoded frame metadata used by validation.

## Storage and references

The server-only `lib/square-blob.ts` owns the S3 client (`forcePathStyle: true`, two attempts, bounded request timeout). Only server credentials are passed to it. Keys are `avatars|banners|screenshots|journal/<owner UUID>/<random UUID>.avif|webp`; `PutObject` uses `If-None-Match: *` and `Cache-Control: public, max-age=31536000, immutable`. The database stores only the key. `lib/media-url.ts` resolves it to the configured public origin at rendering/API boundaries, and validates ownership and traversal restrictions for deletions.

The existing global Next image bypass is retained because this project already uses direct image delivery to avoid optimizer quotas; animated WebP therefore stays animated. The media origin is allowlisted. OG images decode AVIF/WebP to a bounded PNG for Satori.

Profile replacement and its five-slot recent-image history are committed atomically by a backend-only database function. A database failure attempts deletion of the newly uploaded object. Previous optimized images still referenced by the existing history are retained for reuse. Deleting or evicting the last reference queues cleanup after the commit, including cascaded account/content deletes. Failed deletes stay in `media_delete_queue`, so later mutations or `npm run media:cleanup` retry them. Cleanup never deletes legacy ImgChest objects or another owner's key. Public media URLs are unguessable UUID URLs, not per-viewer authenticated storage; content/profile visibility is enforced when returning the reference.

Structured `media.upload.*`, `media.process.complete`, `media.delete.*` and `media.migration.*` events contain dimensions/frame counts/bytes/timing/keys, never credentials or authorization headers.

## Configuration

Set these in `.env.local` and in the Square Cloud application environment, then restart/deploy:

```
SQUARE_BLOB_ENDPOINT=https://s3-blob.squarecloud.app
SQUARE_BLOB_REGION=auto
SQUARE_BLOB_BUCKET=public
SQUARE_BLOB_ACCESS_KEY_ID=<server credential>
SQUARE_BLOB_SECRET_ACCESS_KEY=<server credential>
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.uloggd.com
```

Only `NEXT_PUBLIC_MEDIA_BASE_URL` is public. It defaults to the production media origin; another origin must also be configured in the build environment and `next.config.ts`.

## Migration and maintenance

```
npm run media:migrate -- --dry-run
npm run media:migrate -- --dry-run --limit 20 --user username --type avatar
npm run media:migrate -- --limit 20 --user username
npm run media:cleanup
npm run media:smoke
npm run media:benchmark -- /absolute/path/to/local.gif
```

Dry-run enumerates references and writes no objects or database changes. Actual migration downloads only trusted legacy locations with a byte/time limit, uses the same optimizer, verifies the uploaded object, records it in a private resumable ledger, then conditionally replaces the original reference. Duplicate profile/history references share the same object. Interrupted groups reuse their verified object. Already-migrated keys are skipped. Individual failures are logged and the next group proceeds; originals remain readable. ImgChest is never deleted by the migration. Removing the read fallback is a separate task after all failed/remaining references have been resolved.

The optional smoke uploads a synthetic still and animation, verifies public delivery and then deletes both. CI uses injected S3 commands and generated image fixtures, requiring no real storage credentials. Database tests roll back every mutation. The benchmark measures compression/encoding locally; it does not upload the supplied image.
