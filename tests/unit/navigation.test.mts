import assert from "node:assert/strict";
import test from "node:test";
import {
  navigationPathIsActive,
  sidebarDirectItemCapacity,
} from "../../lib/navigation";

test("navigation active state includes child routes without matching siblings", () => {
  assert.equal(
    navigationPathIsActive(
      "/pt-BR/library/uesleidev/game/halo",
      "/pt-BR/library/uesleidev",
    ),
    true,
  );
  assert.equal(navigationPathIsActive("/pt-BR/reviews/user", "/pt-BR"), false);
  assert.equal(
    navigationPathIsActive(
      "/pt-BR/settings/security",
      "/pt-BR/settings?tab=general",
    ),
    true,
  );
});

test("the sidebar shows everything that fits, and hides More when it does", () => {
  // 55px is a row: 52 of button plus the 3px gap under it.
  const ROW = 55;

  // Exactly enough room for all eight. The bug this replaces was showing
  // "More" here anyway, with a free row sitting underneath it, because the
  // old version guessed at the chrome above the list instead of measuring it.
  assert.equal(sidebarDirectItemCapacity(8 * ROW, 8, ROW), 8);
  // And one pixel more room does not invent a ninth destination.
  assert.equal(sidebarDirectItemCapacity(8 * ROW + 1, 8, ROW), 8);

  // One row short: "More" has to appear, and it costs a row of its own, so
  // six destinations show rather than seven.
  assert.equal(sidebarDirectItemCapacity(7 * ROW, 8, ROW), 6);
  assert.equal(sidebarDirectItemCapacity(4 * ROW, 8, ROW), 3);

  // A sidebar that is only a "More" button is not a sidebar.
  assert.equal(sidebarDirectItemCapacity(ROW, 8, ROW), 1);
  assert.equal(sidebarDirectItemCapacity(10, 8, ROW), 1);
});

test("an unmeasurable sidebar shows everything rather than nothing", () => {
  // Before the first measurement, and in any layout where the numbers come
  // back as zero. Hiding destinations on a guess is the failure that matters;
  // a brief overflow is not.
  assert.equal(sidebarDirectItemCapacity(0, 8, 55), 8);
  assert.equal(sidebarDirectItemCapacity(600, 8, 0), 8);
  assert.equal(sidebarDirectItemCapacity(600, 0, 55), 0);
});
