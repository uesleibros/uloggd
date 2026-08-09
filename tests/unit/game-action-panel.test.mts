import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameActionPanel } from "../../components/library/game-action-panel";

function renderWithStatus(
  status:
    | "WISHLIST"
    | "BACKLOG"
    | "PLAYING"
    | "COMPLETED"
    | "DROPPED"
    | "ON_HOLD",
) {
  return renderToStaticMarkup(
    createElement(GameActionPanel, {
      game: { id: 1, slug: "test-game" },
      initial: {
        status,
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
  const html = renderWithStatus("PLAYING");
  const trigger = statusTrigger(html);

  assert.ok(trigger, "the status trigger was not rendered");
  assert.match(trigger, /Definir status/);
  assert.doesNotMatch(trigger, /Jogando/);
  assert.match(html, /aria-pressed="true"[^>]*>.*?Jogando<\/button>/s);
});

test("a status that belongs to the menu remains visible in its trigger", () => {
  const trigger = statusTrigger(renderWithStatus("COMPLETED"));

  assert.ok(trigger, "the status trigger was not rendered");
  assert.match(trigger, /Jogado/);
  assert.doesNotMatch(trigger, /Definir status/);
});
