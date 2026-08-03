import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The three controls in the header strip look the same.
 *
 * They were written as three separate rules and drifted three times: two
 * backgrounds, two border tokens, two hover treatments, and a one-pixel radius
 * difference. The wallet escaped every mobile override because it is a link
 * and the selectors named `button`, which is what made it the visibly odd one.
 */
const CONTROLS = [
  ".notification-trigger",
  ".header-wallet-link",
  ".locale-switcher-trigger",
];

async function css() {
  const source = await readFile(
    path.join(process.cwd(), "app", "globals.css"),
    "utf8",
  );
  // Comments sit between rules and get swept into the selector by the crude
  // split below, which turns a rule's explanation into part of its name.
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Rules whose selector names one of the controls, with their declarations. */
function rulesFor(source: string, control: string) {
  const found: { selector: string; body: string }[] = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    if (!selector.includes(control)) continue;
    found.push({ selector, body: match[2] });
  }
  return found;
}

test("no control declares a background the others do not share", async () => {
  const source = await css();
  const offenders: string[] = [];
  for (const control of CONTROLS)
    for (const rule of rulesFor(source, control)) {
      // A rule naming exactly one control and setting a surface property is
      // how these drifted apart every time. `button` counts as naming the two
      // that are buttons, so the mobile rule that covers `button` plus the
      // wallet link reaches all three and is not a divergence.
      const named = CONTROLS.filter((other) => rule.selector.includes(other));
      const coversButtons = /\bbutton\b/.test(rule.selector);
      if (named.length > 1 || (coversButtons && named.length >= 1)) continue;
      const surface =
        /(?:^|;|\s)(background|border-color|border-radius)\s*:/.exec(rule.body);
      if (surface) offenders.push(`${rule.selector} sets ${surface[1]}`);
    }
  assert.deepEqual(
    offenders,
    [],
    `these style one header control on its own:\n${offenders.join("\n")}`,
  );
});

test("the mobile header selectors reach the wallet", async () => {
  // Every mobile override named `button`, and the wallet is an anchor. It kept
  // the desktop treatment on a bar where everything else had been restyled.
  const source = await css();
  const mobileRules = [...source.matchAll(/([^{}]*\.mobile-header[^{}]*)\{/g)]
    .map((match) => match[1].replace(/\s+/g, " ").trim())
    .filter((selector) => /\bbutton\b/.test(selector));
  assert.ok(mobileRules.length > 0, "found no mobile header button rules");
  for (const selector of mobileRules)
    assert.ok(
      selector.includes("header-wallet-link"),
      `\`${selector}\` restyles the header's buttons and skips the wallet link`,
    );
});
