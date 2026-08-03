import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ListViewMode } from "../../components/social/list-view-mode";
import { primaryGameCompany } from "../../lib/game-company";
import { resolveViewerRelationship } from "../../lib/connections";

test("game captions credit the developer before the publisher", () => {
  assert.equal(
    primaryGameCompany({
      developers: ["FromSoftware"],
      publishers: ["Bandai Namco"],
    }),
    "FromSoftware",
  );
  assert.equal(
    primaryGameCompany({ developers: [], publishers: ["Nintendo"] }),
    "Nintendo",
  );
});

test("the list owner can switch between the visitor view and editor", () => {
  const view = renderToStaticMarkup(
    createElement(ListViewMode, {
      href: "/pt-BR/lists/lista-1",
      editing: false,
      lang: "pt-BR" as const,
    }),
  );
  assert.match(view, /Visualizar/);
  assert.match(view, /Editar/);
  assert.match(view, /href="\/pt-BR\/lists\/lista-1\?edit=1"/);
  assert.match(view, /aria-current="page"/);
});

test("the quick-create plus keeps list creation available", async () => {
  const source = await readFile(
    new URL("../../components/quick-create-action.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /href=\{`\$\{listsHref\}\?create=1`\}/);
  assert.match(source, /"Criar lista", "Create list", "Crear lista"/);
});

test("rows in your own Following tab are always marked as followed", () => {
  assert.deepEqual(
    resolveViewerRelationship({
      viewerId: "viewer",
      profileId: "viewer",
      tab: "following",
      personId: "friend",
      followed: new Set(),
      followsViewer: new Set(),
    }),
    { viewer_follows: true, follows_viewer: false },
  );
});

test("batch relationship results still apply on somebody else's graph", () => {
  assert.deepEqual(
    resolveViewerRelationship({
      viewerId: "viewer",
      profileId: "someone-else",
      tab: "followers",
      personId: "friend",
      followed: new Set(["friend"]),
      followsViewer: new Set(["friend"]),
    }),
    { viewer_follows: true, follows_viewer: true },
  );
});
