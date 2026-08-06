import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  baseFor,
  contrast,
  deriveCustomTheme,
  parseHex,
  PALETTES,
  customThemeStyle,
} from "../../lib/custom-theme";

/**
 * A theme somebody picked, and the promise that they can still read it.
 *
 * This is the one feature on the site where a reader can produce their own
 * broken page, so the tests are mostly about the guarantee rather than the
 * arithmetic: whatever colour goes in, every piece of text still clears AA on
 * every surface it can land on.
 */

const SURFACES = [
  "console-black",
  "console-canvas",
  "console-panel",
  "console-raised",
  "console-inset",
  "console-hover",
];
const INKS = ["screen-white", "screen-dim", "screen-muted"];

/** The worst text-on-surface pair a derived theme contains. */
function worstPair(colour: string) {
  const theme = deriveCustomTheme(colour);
  assert.ok(theme, `${colour} should derive`);
  const surfaces = SURFACES.map((name) => parseHex(theme.tokens[name])!);
  const inks = INKS.map((name) => parseHex(theme.tokens[name])!);
  return Math.min(
    ...inks.flatMap((ink) => surfaces.map((surface) => contrast(ink, surface))),
  );
}

test("every colour in the space produces a readable theme", () => {
  // A sweep rather than a handful of favourites. The failure this catches is
  // not "purple looks bad", it is one narrow band of hues where the arithmetic
  // lands a hundredth under, which no hand-picked list would find.
  let checked = 0;
  let worst = Infinity;
  let worstColour = "";
  for (let r = 0; r < 256; r += 17)
    for (let g = 0; g < 256; g += 17)
      for (let b = 0; b < 256; b += 17) {
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
        const ratio = worstPair(hex);
        checked++;
        if (ratio < worst) {
          worst = ratio;
          worstColour = hex;
        }
      }
  assert.equal(checked, 16 ** 3);
  assert.ok(
    worst >= 4.5,
    `${worstColour} produced a pair at ${worst.toFixed(3)}:1, under the 4.5 minimum`,
  );
});

test("the colour decides which side of the site you are on", () => {
  // The reason this matters is not the palette: parts of the page ask whether
  // they are light or dark, the profile showcase among them, and they read
  // `data-theme`. A custom theme has to answer that question honestly.
  assert.equal(baseFor(parseHex("#ffffff")!), "light");
  assert.equal(baseFor(parseHex("#000000")!), "dark");
  assert.equal(baseFor(parseHex("#f5e6c8")!), "light", "pale sand is light");
  assert.equal(baseFor(parseHex("#0b3d91")!), "dark", "navy is dark");
  assert.equal(
    deriveCustomTheme("#fff2cc")!.base,
    "light",
    "and the derived theme carries the same answer",
  );
});

test("semantic colours are left alone", () => {
  const theme = deriveCustomTheme("#7a1fa2")!;
  // Status, danger and gold mean something. A "playing" chip tinted toward
  // somebody's favourite purple is a chip that stopped being scannable.
  for (const name of [
    "state-playing-bg",
    "state-completed-bg",
    "danger-text",
    "achievement-gold",
    "brand-blurple-bright",
  ])
    assert.equal(
      theme.tokens[name],
      undefined,
      `${name} must not be rewritten`,
    );
});

test("a colour that is not a colour changes nothing", () => {
  assert.equal(deriveCustomTheme("banana"), null);
  assert.equal(deriveCustomTheme("#12345"), null);
  assert.equal(deriveCustomTheme(""), null);
  // Accepted with or without the hash, and case-insensitively, because both
  // shapes arrive from a colour input depending on the browser.
  assert.ok(deriveCustomTheme("5865F2"));
  assert.ok(deriveCustomTheme("#5865f2"));
});

test("the style string is declarations the root can take", () => {
  const style = customThemeStyle(deriveCustomTheme("#5865f2")!);
  assert.match(style, /--console-canvas:#[0-9a-f]{6}/);
  assert.match(style, /--screen-muted:#[0-9a-f]{6}/);
  assert.equal(style.includes(";;"), false, "no empty declarations");
  assert.equal(style.endsWith(";"), false, "the caller appends its own");
});

test("the copied palettes still match the stylesheet", async () => {
  // This module cannot read `globals.css` at runtime — it runs in a browser —
  // so the values are copied. Copies drift; this is what notices. A theme
  // built on last month's surfaces would still look plausible and would be
  // measured against numbers the page no longer uses.
  const css = await readFile(
    path.join(process.cwd(), "app", "globals.css"),
    "utf8",
  );
  const blocks = {
    dark: css.indexOf(":root {"),
    light: css.indexOf('[data-theme="light"]'),
  };
  for (const [name, start] of Object.entries(blocks)) {
    assert.ok(start > 0, `could not find the ${name} block`);
    const block = css.slice(start, start + css.slice(start).indexOf("\n}"));
    const palette = PALETTES[name as "dark" | "light"];
    for (const [token, expected] of Object.entries(palette.surfaces)) {
      const found = new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
      assert.ok(found, `--${token} is not in the ${name} block`);
      assert.equal(
        found[1].toLowerCase(),
        expected,
        `--${token} drifted in the ${name} theme`,
      );
    }
    for (const [index, token] of [
      "screen-white",
      "screen-dim",
      "screen-muted",
    ].entries()) {
      const found = new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
      assert.ok(found, `--${token} is not in the ${name} block`);
      assert.equal(
        found[1].toLowerCase(),
        palette.text[index],
        `--${token} drifted in the ${name} theme`,
      );
    }
  }
});

/**
 * The script that runs before the first paint.
 *
 * It is inlined into every document as a string, which means a syntax error in
 * it is not a failed build — it is every page on the site throwing before
 * anything renders, with nothing in any test to say so. So it gets compiled
 * and run here against a pretend document.
 */
test("the boot script parses and survives whatever is in storage", async () => {
  const { themeBootstrapScript } = await import("../../lib/theme");
  assert.doesNotThrow(
    () => new Function(themeBootstrapScript),
    "the inlined boot script is not valid JavaScript",
  );

  const run = (stored: Record<string, string>) => {
    const root = {
      dataset: {} as Record<string, string>,
      attrs: {} as Record<string, string>,
      setAttribute(name: string, value: string) {
        this.attrs[name] = value;
      },
    };
    new Function("document", "localStorage", "window", themeBootstrapScript)(
      { documentElement: root },
      { getItem: (key: string) => stored[key] ?? null },
      { matchMedia: () => ({ matches: true }) },
    );
    return root;
  };

  const custom = JSON.stringify({
    colour: "#5865f2",
    base: "light",
    style: "--console-canvas:#eef0ff",
  });

  const applied = run({
    "uloggd:theme": "custom",
    "uloggd:theme-custom": custom,
  });
  assert.equal(applied.dataset.theme, "light", "custom resolves to its base");
  assert.match(applied.attrs.style, /--console-canvas:#eef0ff/);
  assert.match(
    applied.attrs.style,
    /color-scheme:light/,
    "colour-scheme rides in the same attribute; writing it separately loses it",
  );

  // Every way the stored pair can be wrong ends up somewhere sensible rather
  // than on a half-applied theme. Storage is shared with the reader's own
  // devtools and survives across deploys, so none of these is hypothetical.
  for (const broken of [
    { "uloggd:theme": "custom" },
    { "uloggd:theme": "custom", "uloggd:theme-custom": "{{{" },
    { "uloggd:theme": "custom", "uloggd:theme-custom": '{"base":"puce"}' },
    { "uloggd:theme": "mauve" },
    {},
  ]) {
    const root = run(broken);
    assert.equal(root.dataset.themePreference, "auto");
    assert.equal(root.attrs.style, "color-scheme:dark");
  }
});
