import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ListViewMode } from "../../components/social/list-view-mode";
import { StarRating } from "../../components/library/star-rating";
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

test("an unrated star control renders completely empty", () => {
  const html = renderToStaticMarkup(
    createElement(StarRating, {
      value: null,
      onChange: () => undefined,
      lang: "pt-BR" as const,
    }),
  );
  assert.equal((html.match(/data-fill="empty"/g) ?? []).length, 5);
  assert.doesNotMatch(html, /data-fill="half"|data-fill="full"/);
});

test("navigation and account actions keep the requested hierarchy", async () => {
  const [navigation, mobile, account] = await Promise.all([
    readFile(
      new URL("../../components/platform-navigation.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../components/mobile-sidebar.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../components/account-menu.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.ok(
    navigation.indexOf('key: "user"') > navigation.indexOf('key: "shots"'),
  );
  assert.doesNotMatch(navigation, /key: "settings"|key: "moderation"/);
  assert.doesNotMatch(mobile, /drawer-secondary/);
  assert.match(account, /account-menu-settings/);
  assert.match(account, /account-menu-moderation/);
});

test("showcase overlays and card list actions share the intended surfaces", async () => {
  const [styles, stars, quickActions, gameActions, listDialog, listOptions] =
    await Promise.all([
      readFile(new URL("../../app/globals.css", import.meta.url), "utf8"),
      readFile(
        new URL("../../components/library/star-rating.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../components/library/game-quick-actions.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../components/social/game-log-actions.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../components/social/add-game-to-list-dialog.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../app/api/lists/options/route.ts", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(
    styles,
    /\.ui-dropdown-menu-positioner:has\(\.md-heading-menu, \.md-insert-menu\)/,
  );
  assert.match(styles, /\.md-center \.md-dark-only/);
  assert.doesNotMatch(stars, /onFocus=\{\(\) => setPreview/);
  assert.match(quickActions, /<AddGameToListDialog/);
  assert.match(gameActions, /<AddGameToListDialog/);
  assert.match(quickActions, /side = "right"/);
  assert.match(listDialog, /\/api\/lists\/options\?gameId=\$\{game\.id\}/);
  assert.doesNotMatch(listDialog, /supabase\.auth\.getUser/);
  assert.match(listDialog, /game-list-dialog-backdrop/);
  assert.match(listDialog, /data-member=\{list\.containsGame/);
  assert.match(listDialog, /disabled=\{list\.containsGame\}/);
  assert.match(listOptions, /getAuthUser\(\)/);
  assert.match(listOptions, /\.from\("game_list_items"\)/);
  assert.match(listOptions, /containsGame: memberships\.has\(list\.id\)/);
  assert.match(styles, /--layer-dialog-backdrop: 1100/);
});
