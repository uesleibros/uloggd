import assert from "node:assert/strict";
import test from "node:test";
import { verdictFor } from "../../lib/nsfw-detection.ts";

/**
 * The judgement in the screenshot check.
 *
 * Everything else in that module is loading and decoding; this is the part
 * that decides whether someone's screenshot gets a warning on it, and both
 * kinds of mistake cost something real. A miss puts adult content in front of
 * people it should not reach. A false positive puts a warning on an ordinary
 * screenshot, which is the more likely of the two given how much game art the
 * "Sexy" class fires on.
 */
const prediction = (className: string, probability: number) => ({
  className,
  probability,
});

test("ordinary game art is not flagged", () => {
  const verdict = verdictFor([
    prediction("Neutral", 0.82),
    prediction("Drawing", 0.14),
    prediction("Sexy", 0.03),
  ]);
  assert.equal(verdict.sensitive, false);
  assert.equal(verdict.reason, null);
});

test("explicit content is flagged and says which class caught it", () => {
  const verdict = verdictFor([
    prediction("Porn", 0.91),
    prediction("Neutral", 0.06),
  ]);
  assert.equal(verdict.sensitive, true);
  assert.equal(
    verdict.reason,
    "Porn",
    "the class has to come back, or a false positive cannot be explained",
  );
});

test("drawn explicit content is flagged too", () => {
  // A games site, so a model that only caught photographs would miss most of
  // what would actually be posted.
  const verdict = verdictFor([
    prediction("Hentai", 0.74),
    prediction("Drawing", 0.2),
  ]);
  assert.equal(verdict.sensitive, true);
  assert.equal(verdict.reason, "Hentai");
});

test("the suggestive class needs near certainty", () => {
  // This is the class that fires on swimwear, armour and close-ups of faces.
  // At the threshold used for the explicit ones it would put a warning on a
  // large share of ordinary screenshots.
  assert.equal(
    verdictFor([prediction("Sexy", 0.62)]).sensitive,
    false,
    "a middling suggestive score should not cost someone a warning",
  );
  assert.equal(
    verdictFor([prediction("Sexy", 0.55)]).sensitive,
    false,
    "over half is not enough for this class",
  );
  assert.equal(verdictFor([prediction("Sexy", 0.94)]).sensitive, true);
});

test("explicit classes trip well below the suggestive threshold", () => {
  // The two thresholds have to actually differ; equal ones would mean the
  // split between the classes is decorative.
  assert.equal(verdictFor([prediction("Porn", 0.55)]).sensitive, true);
  assert.equal(verdictFor([prediction("Sexy", 0.55)]).sensitive, false);
});

test("an unknown class is never enough on its own", () => {
  // The model's vocabulary is fixed, but a version bump that renamed a class
  // must fail closed on the warning rather than flag everything.
  assert.equal(verdictFor([prediction("Explicit", 0.99)]).sensitive, false);
  assert.equal(verdictFor([]).sensitive, false);
});
