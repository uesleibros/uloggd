import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isPushKind, pushMessage, type PushKind } from "../../lib/push-copy.ts";

/**
 * Every notification kind the database can write needs wording here.
 *
 * A kind without wording is not a crash: the dispatch route logs it and sends
 * nothing, so the person simply never hears about that event, and the only
 * trace is a server log nobody reads. That is the same silent shape as the
 * `else false` in `notification_preference_enabled`, which dropped four kinds
 * at once and was reported by users rather than by anything we ran.
 *
 * The kind list comes from the migrations, not from a copy of it, so adding a
 * kind and forgetting the wording fails here.
 */
async function acceptedKinds(): Promise<string[]> {
  const root = path.join(process.cwd(), "supabase", "migrations");
  const names = (await readdir(root)).filter((name) => name.endsWith(".sql"));
  names.sort();
  let latest: string | null = null;
  for (const name of names) {
    const sql = await readFile(path.join(root, name), "utf8");
    const match = sql.match(
      /notifications_kind_check check \(\s*kind in \(([\s\S]*?)\)\s*\);/,
    );
    if (match) latest = match[1];
  }
  assert.ok(latest, "no kind constraint found in the migrations");
  return [...latest.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
}

test("every notification kind has push wording", async () => {
  const kinds = await acceptedKinds();
  assert.ok(kinds.length > 0, "parsed no kinds from the constraint");

  const missing = kinds.filter((kind) => !isPushKind(kind));
  assert.deepEqual(
    missing,
    [],
    `these would be delivered blank or not at all: ${missing.join(", ")}`,
  );
});

test("wording exists in all three languages and never comes out empty", async () => {
  const kinds = (await acceptedKinds()).filter(isPushKind) as PushKind[];
  for (const kind of kinds) {
    for (const lang of ["pt-BR", "en", "es"] as const) {
      const { title, body } = pushMessage(kind, "Alguém", "Celeste", lang);
      assert.ok(title.trim().length > 0, `${kind}/${lang} has an empty title`);
      assert.ok(body.trim().length > 0, `${kind}/${lang} has an empty body`);
    }
  }
});

test("a notification with no actor still reads as a sentence", () => {
  // Moderation events have no actor, and naming one would be wrong anyway.
  const { body } = pushMessage(
    "moderation_comment_removed",
    null,
    null,
    "pt-BR",
  );
  assert.ok(
    !body.startsWith(" ") && body.length > 10,
    "an actorless notification produced a fragment",
  );

  // A like whose actor could not be resolved must not read as " curtiu".
  const orphan = pushMessage("review_like", null, null, "pt-BR");
  assert.ok(
    !orphan.body.startsWith(" "),
    "a missing actor left a leading space where the name should be",
  );
});

test("the title falls back to the app name when there is no target", () => {
  const { title } = pushMessage("follow", "Alguém", null, "pt-BR");
  assert.equal(title, "uloggd");
});
