# Server screening for user images

Avatars and banners appear beside names and across profile pages without a
viewer choosing to reveal them. The browser's NSFWJS check gives early feedback,
but a caller can skip browser code and send a multipart request directly. A
hash of client-generated model features cannot establish that the classifier
ran: the caller can invent both the features and the hash. Recomputing those
features on the server costs much of the model work anyway.

The profile image endpoint therefore classifies the final uploaded bytes on
the server. It decodes an image with Sharp, rejects animation, bounds the input
to 40 million pixels, resizes it, encodes it as WebP, then runs NSFWJS over a
224 by 224 RGB version of that WebP. Only the normalized WebP is uploaded to
ImgChest. The existing thresholds are shared with the browser. A sensitive
result answers `422 sensitive_image`; an unavailable model answers 503 and
leaves the old picture in place.

The five changes per ten minutes limit is claimed before image decoding and
inference. The model loads on demand and is cached per server process. A local
measurement with the default CPU backend took about 0.7 seconds per warm
classification and added roughly 200 to 260 MB of resident memory to one
Node process. Watch worker recycling and request latency after deployment.

### Model startup messages

The `You're using the model: 'MobileNetV2'` message is NSFWJS's informational
notice when selecting its bundled model. The server uses that bundled model;
it does not download model weights from a hosted URL at startup.
The TensorFlow.js Node backend recommendation comes from the JavaScript CPU
backend and is a performance notice, not a failed classification.

Production enables `tf.enableProdMode()` before initializing the backend and
model, following the [NSFWJS production guidance](https://github.com/infinitered/nsfwjs#production).
Development keeps runtime checks and the CPU performance notice. The NSFWJS
model selection message remains informational in both environments.
This setting does not install a native backend, change the model or thresholds,
or establish a measured speed increase. Adopting `@tensorflow/tfjs-node` needs
inference and memory measurements on the Linux deployment and verification of
its native binaries in the standalone package. Windows development timings
alone do not establish that deployment's performance.

The database migration revokes direct authenticated writes to `avatar_url` and
`banner_url`. The verified endpoint uses the server's admin client only for
those columns, constrained to the authenticated user's id. Apply the migration
with the application release; until it is applied, direct database writes can
still bypass screening. Historical image reuse fetches at most 8 MB from the
known ImgChest URL and screens it again because older history predates this
rule. Animated GIFs are refused rather than checking only their first frame.
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
