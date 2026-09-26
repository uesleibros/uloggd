import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { moderationActionLabel } from "@/lib/moderation";

/**
 * Every decision the audit log can show is written in words.
 *
 * `moderationActionLabel` falls back to the raw value with its underscores
 * swapped for spaces, so an action nobody wrote a case for appears as
 * "review removed": English, lower case, between lines of proper Portuguese.
 * Three of them were like that, all three written by the post removal added
 * after the labels were.
 *
 * The list is not repeated here. It is read out of the check constraint in
 * the migration that owns it, so adding a fourteenth action to the database
 * and forgetting the label fails here rather than on the page.
 */

const ROOT = process.cwd();

test("no action reaches the audit log unnamed", async () => {
  const sql = await readFile(
    path.join(
      ROOT,
      "supabase",
      "migrations",
      "20260923000300_moderate_posts.sql",
    ),
    "utf8",
  );
  const check =
    /action in \(([^)]+)\)/i.exec(sql) ??
    /check \(action in \(([^)]+)\)/i.exec(sql);
  assert.ok(check, "the migration no longer states the actions it allows");
  const actions = [...check[1].matchAll(/'([A-Z_]+)'/g)].map((one) => one[1]);
  assert.ok(actions.length >= 14, `only found ${actions.length} actions`);

  for (const action of actions) {
    const label = moderationActionLabel(action, "pt-BR");
    assert.notEqual(
      label,
      action.replaceAll("_", " ").toLowerCase(),
      `${action} has no label and falls back to its own name`,
    );
  }
});
