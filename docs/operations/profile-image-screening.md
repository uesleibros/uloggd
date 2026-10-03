# Server screening for user images

Avatars and banners appear beside names and across profile pages without a
viewer choosing to reveal them. The browser's NSFWJS check gives early feedback,
but a caller can skip browser code and send a multipart request directly. A
hash of client-generated model features cannot establish that the classifier
ran: the caller can invent both the features and the hash. Recomputing those
features on the server costs much of the model work anyway.

The profile image endpoint therefore classifies the final uploaded bytes on
the server. It decodes an image with Sharp, preserves animation, bounds the input
to 40 million pixels across at most 300 frames, resizes it, encodes it as WebP,
then runs NSFWJS over every distinct frame and the normalized screening views.
Only the normalized WebP, bounded to 8 MB, is uploaded to
ImgChest. The existing thresholds are shared with the browser. A sensitive
result answers `422 sensitive_image`; an unavailable model answers 503 and
leaves the old picture in place.

The five changes per ten minutes limit is claimed before image decoding and
inference. The model loads on demand and is cached per server process. Inference
uses TensorFlow.js WASM with SIMD, avoiding the slow JavaScript
CPU backend and native addon installation. Server-computed SHA-256 verdicts
are reused for 15 minutes, bounded to 512 entries, and identical concurrent
analyses are coalesced. The cache contains hashes and verdicts, never image
bytes, and does not use the Redis database reserved for IGDB. The backend is
configured for at most two threads where supported; TensorFlow.js 4.22 disables
WASM multithreading in Node, so server inference currently uses one SIMD thread.

### Model startup messages

The `You're using the model: 'MobileNetV2'` message is NSFWJS's informational
notice when selecting its bundled model. The server uses that bundled model;
it does not download model weights from a hosted URL at startup.
The TensorFlow.js Node backend recommendation comes from the JavaScript CPU
backend and is a performance notice, not a failed classification.

Production enables `tf.enableProdMode()` before initializing the backend and
model, following the [NSFWJS production guidance](https://github.com/infinitered/nsfwjs#production).
The WASM backend avoids TensorFlow.js's Node CPU backend recommendation. The
NSFWJS model selection message remains informational in both environments.
The three WASM binaries are explicitly traced into the standalone deployment.
On Windows, the supplied 540x540 GIF (50 frames, 7 MB) was screened successfully
in about 40 seconds on first use and preserved all frames and timing in a
2 MB WebP. Linux deployment latency still depends on available CPU and load.

Signing predictions supplied by a browser does not prove that inference ran.
HMAC can protect a result computed by a trusted classifier; it cannot make
invented client predictions trustworthy. The application retains trusted
server analysis rather than adding another hosted service solely to sign
unverified predictions.

The database migration revokes direct authenticated writes to `avatar_url` and
`banner_url`. The verified endpoint uses the server's admin client only for
those columns, constrained to the authenticated user's id. Apply the migration
with the application release; until it is applied, direct database writes can
still bypass screening. Historical image reuse fetches at most 8 MB from the
known ImgChest URL and screens it again because older history predates this
rule. Animated images have every distinct frame screened, including reuse.
Before the migration, `has_column_privilege` returned true for authenticated
avatar update, banner update, and avatar insert.

Screenshots and journal images use the same server model on their final WebP
bytes. The browser still gives early feedback. Both screenshot upload routes
set `sensitive` when the author, browser, or server flags an image, and record
an automatic detection in `sensitive_detected`. A journal image flagged by the
server marks its parent entry before the bytes leave the server. If screening
is unavailable, these upload routes return 503 and publish nothing.

Migration `20260929000400_verified_image_writes.sql` removes direct client
inserts into screenshots and journal images, plus direct updates to journal
image rows. The verified server routes use the admin client only after checking
the caller's identity and ownership, image size and type, rate or count limit,
and the model result. Screenshot edits, image removal, and the authorized
journal reorder function continue to work. Deploy the route changes before
applying the migration so uploads do not fail between releases.

NSFWJS can produce false positives and false negatives. Screenshot and journal
authors can still change the visible sensitive flag, while the automatic
detection record remains. Reports and human moderation remain necessary.

Validation:

```text
npx tsx --test tests/unit/profile-image-screening.test.mts
npm run test:e2e:built -- profile-image-screening --project=desktop-chromium --workers=1
npx tsx --test tests/db/image-upload-privileges.test.mts
```
