import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameActionPanel } from "../../components/library/game-action-panel";

type Status =
  "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";

function render(status: Status, playing = status === "PLAYING") {
  return renderToStaticMarkup(
    createElement(GameActionPanel, {
      game: { id: 1, slug: "test-game" },
      initial: {
        status,
        playing,
        backlog: status === "BACKLOG",
        wishlist: status === "WISHLIST",
        liked: false,
        quick_rating: null,
      },
      lang: "pt-BR",
      enabled: true,
    }),
  );
}

function statusTrigger(html: string) {
  return html.match(/<button class="game-status-button".*?<\/button>/s)?.[0];
}

test("playing remains a direct action instead of becoming the menu value", () => {
  const html = render("PLAYING");
  const trigger = statusTrigger(html);

  assert.ok(trigger, "the status trigger was not rendered");
  assert.match(trigger, /Definir status/);
  assert.doesNotMatch(trigger, /Jogando/);
  assert.match(html, /aria-pressed="true"[^>]*>.*?Jogando<\/button>/s);
});

test("a status that belongs to the menu remains visible in its trigger", () => {
  const trigger = statusTrigger(render("COMPLETED"));

  assert.ok(trigger, "the status trigger was not rendered");
  assert.match(trigger, /Jogado/);
  assert.doesNotMatch(trigger, /Definir status/);
});

test("a game can be played and being played at once", () => {
  // The bug this pins: picking a status in the menu turned "Jogando" off,
  // because the button read the status instead of the flag beside it. A
  // replay is exactly the case where somebody needs to say both.
  const html = render("COMPLETED", true);

  assert.match(statusTrigger(html) ?? "", /Jogado/);
  assert.match(html, /aria-pressed="true"[^>]*>.*?Jogando<\/button>/s);
});

test("the flag is what the button reads, not the status", () => {
  // And the other way round: a row whose status still says PLAYING from
  // before the flag existed does not light the button on its own.
  const html = render("PLAYING", false);

  assert.match(html, /aria-pressed="false"[^>]*>.*?Jogando<\/button>/s);
});
