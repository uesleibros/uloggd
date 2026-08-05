import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Whether the text on this site can be read.
 *
 * The first accessibility scan ever run against it came back with the same
 * finding on all six pages it looked at: seventeen or eighteen elements per
 * page below the WCAG AA contrast minimum. Not an edge case, and not one
 * component; two design tokens used everywhere.
 *
 * That scan needs a browser, which means it runs only in CI and takes six
 * minutes. This is the same arithmetic against the same tokens, and it runs
 * in milliseconds, so the next value somebody picks by eye fails here first.
 *
 * The rule is 4.5:1 for ordinary text, and the surface that decides is the
 * least contrasting one the text lands on, not the most.
 */

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Reads one custom property out of one theme block.
 *
 * Bounded by the block's own closing brace, not by a character count. Slicing
 * a fixed window past the end read the next theme's values and reported the
 * dark palette as failing against a light background, which is a pair that
 * never appears on screen.
 */
function token(css: string, blockStart: number, name: string) {
  const end = css.indexOf("\n}", blockStart);
  assert.ok(end > blockStart, "the theme block has no closing brace");
  const block = css.slice(blockStart, end);
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
  assert.ok(match, `--${name} is missing or no longer a plain hex colour`);
  return match[1].toLowerCase();
}

const AA_NORMAL = 4.5;

test("muted text is readable on every surface it lands on", async () => {
  const css = await readFile(
    path.join(process.cwd(), "app", "globals.css"),
    "utf8",
  );
  // Anchored at the start of each block so the reader stays inside it.
  const themes = [
    { name: "dark", at: css.indexOf(":root {") },
    { name: "light", at: css.indexOf("color-scheme: light") },
  ];

  const failures: string[] = [];
  for (const theme of themes) {
    assert.ok(theme.at > 0, `could not find the ${theme.name} theme block`);
    const muted = token(css, theme.at, "screen-muted");
    const dim = token(css, theme.at, "screen-dim");
    // Every background muted or dim text is drawn on. Panel and canvas are the
    // common ones; inset is the dimmest, and it is the one that used to fail
    // while the others passed, which is how a value picked against white ships
    // unreadable everywhere else.
    const surfaces = ["console-canvas", "console-panel", "console-inset"].map(
      (name) => [name, token(css, theme.at, name)] as const,
    );

    // Not just the two that started this. The gold was corrected once against
    // white and the canvas, passed both, and still failed on the inset in the
    // next browser run: a token checked against some of its surfaces is a
    // token that has not been checked.
    const gold = token(css, theme.at, "achievement-gold");
    const safe = token(css, theme.at, "safe-green");
    const warning = token(css, theme.at, "warning-text");

    for (const [label, text] of [
      ["screen-muted", muted],
      ["screen-dim", dim],
      ["achievement-gold", gold],
      ["safe-green", safe],
      ["warning-text", warning],
    ] as const)
      for (const [surfaceName, surface] of surfaces) {
        const ratio = contrast(text, surface);
        if (ratio < AA_NORMAL)
          failures.push(
            `${theme.name}: --${label} ${text} on --${surfaceName} ${surface} is ${ratio.toFixed(2)}:1, needs ${AA_NORMAL}:1`,
          );
      }
  }

  assert.deepEqual(failures, [], `\n  ${failures.join("\n  ")}`);
});

test("the contrast maths agrees with the reference values", async () => {
  // Guards the guard. Without this, a broken luminance function reports
  // everything as passing and the test above becomes decoration.
  assert.equal(contrast("#ffffff", "#000000").toFixed(0), "21");
  assert.equal(contrast("#000000", "#ffffff").toFixed(0), "21");
  assert.equal(contrast("#777777", "#ffffff").toFixed(2), "4.48");
  // The exact pair the browser scan reported, to two decimals.
  assert.equal(contrast("#747984", "#ffffff").toFixed(2), "4.37");
});
