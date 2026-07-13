# uloggd Interface System

## Direction

The uloggd interface should feel like a personal game library used at night: quiet, dense, tactile, and editorial. It is a product for players deciding what to play, logging their journey, and returning to games over time—not a generic analytics dashboard or game-store landing page.

Domain vocabulary: game journal, backlog, physical covers, shelf, play session, achievement, progress, community log, discovery.

Avoid generic SaaS patterns, promotional gradients, symmetrical metric-card grids, oversized landing-page heroes, repeated content across columns, and decorative color without meaning.

## Product Signature

The recurring signature is the **active shelf**:

- Covers are treated as objects in a personal collection, not interchangeable cards.
- Rankings use small physical-style index labels.
- Progress, rating, year, and genre appear as compact log metadata.
- Editorial highlights combine artwork and cover art, preserving the feeling of selecting a game from a library.
- Dense lists follow the shelf to create uneven, intentional rhythm.

This signature should appear in the home feed, library, profile collections, lists, reviews, and discovery screens.

## Color World

Colors come from console hardware and late-night screens:

- `--console-black: #0b0a0d` — page perimeter and deepest background.
- `--console-canvas: #0f0e11` — primary content canvas.
- `--console-panel: #17151b` — navigation and persistent panels.
- `--console-raised: #1c1a20` — cards, drawers, and raised controls.
- `--console-inset: #0c0b0e` — search fields and input surfaces.
- `--console-hover: #222027` — hover and pressed navigation surfaces.
- `--screen-white: #f4f2f6` — primary text.
- `--screen-dim: #aaa5af` — supporting text.
- `--screen-muted: #716c77` — metadata and disabled hierarchy.
- `--brand-blurple: #5865f2` — Discord-inspired primary action and current state only.
- `--brand-blurple-bright: #7983f5` — hover and high-emphasis brand state.
- `--brand-blurple-wash: rgb(88 101 242 / 13%)` — tonal brand surface.
- `--achievement-gold: #d3b55b` — ratings and achievements only.
- `--safe-green: #73c69a` — safety and positive status only.

Use approximately 60% canvas, 30% panel/raised surfaces, and no more than 10% accent. Do not introduce new accent hues without a semantic role.

## Depth Strategy

Use **surface shifts plus quiet borders**. Dark-mode shadows are secondary and should never define the hierarchy alone.

- Canvas → panel → raised → overlay should increase lightness subtly.
- Standard border: `rgba(255, 255, 255, 0.07)`.
- Emphasis border: `rgba(255, 255, 255, 0.11)`.
- Inputs are darker than their parent because they receive content.
- Persistent sidebar has a solid `console-panel` background and an emphasis border.
- Image edges use a neutral white inset outline around 9–10% opacity.
- Avoid dramatic shadows and tinted borders.

## Spacing and Density

Base unit: **4px**.

- Micro gaps: 4–8px.
- Control gaps and padding: 8–12px.
- Navigation row height: 44–46px.
- Compact list row: 54–62px.
- Card/internal padding: 16–20px.
- Feed section padding: 32–36px desktop; 18–30px mobile.
- Major separation: 32–40px.
- Desktop sidebar: 264px full; 76px compact.
- The sidebar structural column itself has no outer padding; brand, scrollable navigation, and account control own their internal gutters so the panel remains flush with the application canvas.
- The document, application shell, and sidebar explicitly use zero outer margin/padding; the sticky sidebar is anchored to the viewport's inline-start edge and fills its grid track.
- Brand starts 20px from the top, navigation follows after 16px without a second nested top margin, and the 60px account control uses even 8px internal padding; these three zones share the same 20px visual gutter.
- Context rail: 320px full; 290px compact; hidden at 960px and below to prevent tablet overflow.
- The application canvas is full-viewport; never cap the global shell or center it inside decorative outer gutters. Width constraints belong to readable text and focused controls, not the product frame.
- Game pages use a compact 16px outer gutter; larger spacing belongs between cover, primary content, and context rail rather than outside the rails.

The feed should alternate between expressive/editorial zones and compact working zones. Do not give every section the same gap, card shape, or density.

## Typography

Primary typeface: Geist Sans Variable through `next/font`, followed by the native Apple system stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`) as fallback. Never place Arial before the loaded font. Monospace metadata uses Geist Mono.

Approximate scale:

- Micro metadata: 8–10px, 500–650, muted, optionally tracked.
- Supporting metadata: 10–11px, 400–600.
- Product body: 12–14px, line-height 1.5–1.65.
- Section title: 16–19px, 620–650, negative tracking.
- Page title: 28px, 650, `-0.045em` tracking.
- Editorial game title: 28–42px, 680, `-0.055em` tracking.
- Legal/document display: 36–54px.

Use weight and color before adding font size. Headings use balanced wrapping; paragraphs use pretty wrapping. Dynamic numbers use tabular numerals.

Reserve 640+ weights for page/editorial focal points and the wordmark. Section headings and active navigation use 600–620; card titles, rail rows, labels, and secondary controls use 500–600 so multiple elements do not compete for attention.

## Radius Scale

- Small controls and image thumbnails: 5–7px.
- Navigation and buttons: 7–9px.
- Panels and feature surfaces: 10–14px.
- Circular elements only for avatars and status dots.

Nested radii must be concentric: outer radius equals the inner radius plus surrounding padding where visually applicable.

## Navigation Patterns

### Desktop sidebar

- 264px wide, sticky, full viewport height.
- Solid `console-panel` background with `shell-line-strong` right border.
- Brand plus subtle beta stage at top.
- Navigation rows are uniformly 48px high with an 8px radius on desktop, compact, and mobile drawer states.
- Current route uses a graphite hover surface, white icon and label, and one small blurple status dot. Blurple never floods the navigation row.
- Quick-log action is tonal, not a large saturated pill.
- Account control stays at the bottom and must not fabricate authenticated state.
- Signed-out account controls use a neutral login glyph; initials and avatars are reserved for real authenticated profiles.
- Signed-out navigation keeps Home, Explore, search, language, and legal documents available. Library, Reviews, Profile, Settings, and quick-log render as non-interactive muted rows with a small lock glyph and an accessible sign-in requirement.
- Above 1100px, the sidebar can collapse from 264px to 76px using a persistent edge control; the compact state keeps 44px icon targets, route state, account access, and the content canvas expansion.

### Compact sidebar

- 76px wide below 1100px.
- Icons remain centered in 44px hit areas.
- Text, keyboard hint, beta label, and account metadata collapse.

### Mobile navigation

- Persistent 60px header with the menu trigger on the left and search on the right; the logo stays inside the drawer instead of occupying the center.
- Sidebar remains available through the menu trigger.
- Do not use a bottom navigation bar; all destinations live in the drawer to avoid competing navigation systems.
- Drawer behavior uses Radix Dialog for focus trapping, Escape handling, focus return, and accessible overlay state.
- Drawer animation: 240ms entry, 160ms exit, transform and opacity only.
- The authenticated account control spans the full drawer width at the bottom; compact desktop sidebar rules must never collapse its identity, metadata, or menu chevron.

## Authentication Pattern

- Authentication keeps the product shell and navigation visible; it is an entry point to the library, not a detached marketing page.
- Desktop uses an asymmetrical split: a tactile active-shelf scene on the left and a focused access column on the right.
- The passkey is the primary action because it is the intended passwordless default. OAuth providers appear as a compact two-column utility grid below it.
- The active shelf uses real IGDB cover data when available and keeps one concise library title plus supporting line. The form itself starts directly at its main heading without a redundant eyebrow.
- On mobile, the shelf compresses into a short context banner and the form becomes a single uninterrupted column below it.
- Authentication errors are inline, reserved, and actionable. Loading disables competing methods so two ceremonies cannot start at once.
- Security copy must accurately state that biometric verification stays on the device; never imply that uloggd stores biometric data.
- Terms, Privacy, and Child Safety must all be directly available in the desktop sidebar and mobile drawer.

## Reusable Component Patterns

### Profile settings

- Profile settings use one focused content column up to 820px while profile is the only available settings area; do not show empty local navigation or unfinished security sections.
- Public identity separates imagery from text: a 3:1 banner, circular avatar, then optional display name, free-form pronouns (30 characters), and bio (500 characters).
- Public details, avatar, and banner use three distinct settings sections. Each image section includes a domain icon, preview, upload/remove actions, recommended dimensions, the 8 MB source limit, and supported JPG/PNG/WebP formats.
- Avatar and banner uploads always pass through a Radix crop modal. Avatar crops at 1:1 to a maximum 640px; banner crops at 3:1 to a maximum 1800px; both export compressed WebP before server upload.
- Image-provider credentials remain server-only. Upload controls expose loading, invalid-file, provider-failure, remove, and empty states.

### Brand

- Real `/logo.jpg`, 38×38px desktop.
- 9px radius with neutral inset edge.
- Wordmark at 23px/760 with tight negative tracking.

### Quick log button

- 44px height.
- 9px radius.
- Violet wash background and low-opacity violet border.
- 19px leading icon, 13px/650 label, optional keyboard hint.
- Active feedback uses `scale(0.98)`.

### Editorial featured game

- Artwork backdrop plus separate 3:4 cover object.
- One dominant game title; rating/year/genre form a single metadata line.
- Description is clamped to three lines.
- Primary action is neutral white; save action is a quiet secondary square.
- Mobile reduces cover to 96px and removes long description rather than squeezing it.

### Active shelf

- Five covers across on desktop.
- Horizontal scroll with 126px cover items on mobile.
- Cover ratio 3:4, 7px radius.
- Rank label sits at the bottom-left over the image.
- Save action appears on hover/focus desktop and remains visible on touch devices.
- A saved custom cover is a library-wide preference: every authenticated catalog surface resolves it before the IGDB default.
- Mobile discovery lanes become horizontal snap shelves across the full 0–620px range; cards stay between 112px and 132px so cover art, titles, and three quick-action targets remain usable instead of compressing into a four-column grid.

### Cover picker

- The game page shows only the active cover plus one quiet “Change cover” control.
- Alternatives open in a Radix modal and identify their source as Default, Localized, or Edition.
- Selection is provisional until Save; Cancel restores the saved cover.
- Desktop uses a centered, scrollable grid. Mobile uses a bottom sheet with two columns and equal Cancel/Save actions.

### Related game shelves

- Relations remain separated by IGDB meaning: DLCs/expansions, editions/ports, remakes/remasters, and similar games.
- Relations share one tabbed module so the game page does not grow by repeating four shelves.
- Each selected group uses the active-shelf card with internal links, quick actions, and the account's saved cover.
- Desktop uses six covers per row; mobile preserves every result in a horizontal snap shelf.

### Game context rail

- Desktop game pages use cover / primary content / context rail columns.
- The context rail owns IGDB time-to-beat data, catalog score, release, genres, platforms, publisher, themes, and modes.
- Similar games appear as a short compact-cover list in the context rail, not as another full related-games tab.
- Tablet moves the rail below primary content; mobile stacks cover, content, and context without a persistent side column.
- After About, gallery, videos, events, links, and related games span the combined cover + primary-content width while the context rail continues independently at the right.
- On mobile, game media sections are strictly contained to the viewport: grids use zero-minimum columns, embeds cap at 100%, long metadata wraps, and horizontal overflow belongs only to the related-game shelf without negative outer margins.

### Compact game row

- 62px minimum height.
- 42px cover, primary title, muted metadata, tabular rating, add control.
- Use tonal hover only; do not wrap each row in an individual card.

### Global catalog search

- Desktop search is persistent in a 64px content header, up to 420px wide, with `/` as a focus shortcut.
- Results open in a 480px overlay and use dense cover rows: 44px cover, title, year/platform metadata, and a small type label only for DLCs, expansions, and editions.
- Queries wait 280ms, abort stale requests, cache repeated terms in the browser, and rank exact/prefix matches ahead of IGDB popularity.
- Mobile keeps only the search trigger in the persistent header. It opens a full-height Radix Dialog, focuses a 48px input, and uses 72px result rows with 48px covers.
- Search loading, minimum-query, empty, and server-error states use direct text; do not add decorative empty-state icons.
- Opening results never changes the search field geometry; the dropdown overlays below the stable header field. Personalized result caching is scoped per authenticated account so saved covers cannot leak across signed-in and anonymous states.

### Context rail panel

- 12px radius, 20px padding.
- One onboarding or context action, followed by a dense trend list.
- Must not repeat the exact feed content or hierarchy.
- Signed-out home rails explain the library and link to authentication; signed-in rails replace that pitch with real collection, playing, and rating counts plus a library shortcut.
- Ranked catalog rows include compact 3:4 covers, index, title, and rating volume so they remain identifiable at a glance.

### Star rating

- Personal ratings use five gold stars with half-star precision backed by the existing 0–100 value (10 points per half-star).
- The game page shows the full labeled control; cover menus use the compact five-star variant.
- Clicking the currently selected half-star again clears only the rating and returns the control to five empty stars; no separate remove button or numeric “x of 5” label is shown.
- When that repeated click clears a rating, the hover preview is reset immediately so the stars visibly empty without requiring the pointer to leave first.
- Hovering or keyboard-focusing either half of a star previews that half-step and every preceding star before the rating is committed.
- Rating a new game adds it to the library as Backlog. Library cards expose a clearly destructive remove action in their overflow menu.

### Legal document switcher

- All three documents remain visible at once on desktop and mobile.
- Desktop uses three compact horizontal segments.
- Mobile keeps three equal columns with stacked icon and balanced label; never hide documents behind horizontal scrolling.

### Cookie notice and settings

- When only necessary storage exists, show a compact informational notice with “Continue with necessary” and “Settings”; never fabricate an “Accept all” choice for inactive categories.
- Cookie settings use a focused Radix modal listing Necessary, Preferences, Analytics, and Marketing. Necessary is always active; unused optional categories remain visibly unavailable.
- The footer always reopens settings. Any future optional category must remain off until a valid choice and offer equally prominent accept and reject actions.

## Interaction States

Every interactive control requires:

- Visible keyboard focus using a 2px violet outline with 3px offset.
- Tonal hover state.
- Press feedback between `scale(0.97)` and `scale(0.98)` when appropriate.
- Minimum 40px hit area; prefer 44px for navigation.
- Disabled state using muted text and no pointer response.
- Loading, empty, and error states before data-backed features ship.

Do not use `transition: all`. Animate only transform, opacity, background color, border color, and text color as needed.

## Motion

- Buttons and frequent controls: 100–140ms.
- Hover surfaces: 130–180ms.
- Drawer entry: 240ms using `cubic-bezier(0.23, 1, 0.32, 1)`.
- Drawer exit: 160ms using `cubic-bezier(0.77, 0, 0.175, 1)`.
- Avoid animation on repeated keyboard-driven actions.
- Respect `prefers-reduced-motion` by removing movement while preserving immediate state changes.
- Dropdowns enter in 140–160ms from their trigger origin. Centered modals use a 200ms opacity plus subtle 0.985 scale/vertical offset; mobile sheets enter upward by 12px. Overlays fade in over 160ms. Never animate layout dimensions.
- Radix menus and dialogs must also animate their `data-state="closed"` state for 110–150ms; conditional parents remain mounted until that exit finishes so overlays never disappear abruptly.

## Content Principles

- Never fabricate user activity, online counts, progress, or authenticated identity.
- IGDB catalog data may populate discovery surfaces; clearly distinguish it from uloggd community data.
- Use direct product language, not promotional copy.
- Empty social areas should explain what becomes available after accounts/data exist.
- Portuguese is the primary product language; every new interface string must also be represented in the English dictionary.

## Craft Checks

Before shipping a new screen:

1. Squint test: editorial focus, navigation, and secondary data remain distinguishable.
2. Swap test: the screen should still read as a game journal if the uloggd wordmark is hidden.
3. Signature test: identify at least one active-shelf expression and four supporting domain-specific details.
4. Token test: no arbitrary hex colors outside this system without a documented semantic need.
5. State test: verify hover, active, focus, loading, empty, error, and mobile behavior.
6. Run desktop and mobile visual checks, lint, TypeScript, and production build.
