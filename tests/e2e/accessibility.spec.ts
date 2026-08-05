import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Whether the site can be used without a mouse or without sight.
 *
 * This had never been measured. Counting `aria-label` attributes against
 * `<button>` tags said nothing: the ratio is the same whether every control is
 * labelled or half of them are labelled twice.
 *
 * Scoped to serious and critical findings. The moderate and minor rules
 * include things like "this heading level was skipped", which are worth fixing
 * but are not worth a red build; contrast, missing names and broken landmarks
 * are, because each one is somebody unable to use the page at all.
 */
const PAGES = [
  ["home", "/pt-BR"],
  ["search", "/pt-BR/search"],
  ["sign in", "/pt-BR/login"],
  ["a profile", "/pt-BR/u/UesleiDev"],
  ["a game", "/pt-BR/game/e2e-game-1"],
  ["terms", "/pt-BR/legal/terms"],
] as const;

/**
 * Scanned with motion turned off, which is what made this suite reliable.
 *
 * Entries on the home page fade in, and axe reads whatever colour is on
 * screen at the instant it looks. Caught mid-fade it measured `#6d727b` on
 * `#e8eaed` and called the contrast 4.01 — but neither colour exists in the
 * stylesheet. They are the real pair blended toward the page behind them, and
 * the settled values, `--screen-muted` on `--console-inset`, are 5.07. So the
 * failure was the clock, not the palette, and it only appeared when a review
 * carrying aspect ratings happened to be among the four the home page shows.
 *
 * Reduced motion is the fix rather than a wait, because the components already
 * honour it: `useReducedMotion` makes them mount at their final opacity, so
 * there is no transition to be caught halfway through instead of a race that
 * is merely harder to lose.
 */
test.use({ contextOptions: { reducedMotion: "reduce" } });

for (const [label, path] of PAGES) {
  test(`${label} has no serious accessibility failures`, async ({ page }) => {
    await page.goto(path);
    // The shell streams, so the content arrives after first paint. Waiting for
    // the region rather than for the network to fall quiet: `networkidle` is
    // discouraged and never settles on a page holding a socket open, while
    // scanning the skeleton would pass on markup nobody sees.
    await page.locator("main").first().waitFor({ state: "visible" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    // Named in the failure so the report says what to fix rather than how many.
    const summary = serious
      .map(
        (violation) =>
          `${violation.id} (${violation.impact}, ${violation.nodes.length}x): ${violation.help}\n    ${violation.nodes[0]?.target.join(" ")}`,
      )
      .join("\n  ");
    expect(serious, `\n  ${summary}`).toEqual([]);
  });
}

test("every page can be reached and left by keyboard alone", async ({
  page,
}) => {
  await page.goto("/pt-BR");
  await page.locator("main").first().waitFor({ state: "visible" });

  // A skip link, or a first tab stop that goes somewhere useful. Without one,
  // reaching the content past a sidebar of a dozen links costs a dozen presses
  // on every single page.
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return null;
    return {
      tag: active.tagName.toLowerCase(),
      text: (active.textContent ?? "").trim().slice(0, 40),
      visible: active.getBoundingClientRect().height > 0,
    };
  });
  expect(first, "nothing takes focus on the first Tab").not.toBeNull();
  expect(first!.visible, `focus landed on a hidden ${first!.tag}`).toBe(true);
});
