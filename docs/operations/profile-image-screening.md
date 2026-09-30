# Server screening for profile images

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

The database migration revokes direct authenticated writes to `avatar_url` and
`banner_url`. The verified endpoint uses the server's admin client only for
those columns, constrained to the authenticated user's id. Apply the migration
with the application release; until it is applied, direct database writes can
still bypass screening. Historical image reuse fetches at most 8 MB from the
known ImgChest URL and screens it again because older history predates this
rule. Animated GIFs are refused rather than checking only their first frame.
Before the migration, `has_column_privilege` returned true for authenticated
avatar update, banner update, and avatar insert.

Screenshots and journal images still have the existing client-side suggestions
and sensitive covers. They are separate upload paths and are not protected by
this profile-image rule. NSFWJS is a classifier with false positives and false
negatives, so reporting and human moderation remain necessary.

Validation:

```text
npx tsx --test tests/unit/profile-image-screening.test.mts
npm run test:e2e:built -- profile-image-screening --project=desktop-chromium --workers=1
```
