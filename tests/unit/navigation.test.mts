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

test("sidebar reveals destinations as viewport height becomes available", () => {
  assert.equal(sidebarDirectItemCapacity(420, 8), 3);
  assert.equal(sidebarDirectItemCapacity(600, 8), 4);
  assert.equal(sidebarDirectItemCapacity(900, 8), 8);
  assert.equal(sidebarDirectItemCapacity(900, 2), 2);
});
