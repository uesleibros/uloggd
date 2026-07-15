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
- Desktop sidebar: 232px full; 64px compact.
- The sidebar structural column itself has no outer padding; brand, scrollable navigation, and account control own their internal gutters so the panel remains flush with the application canvas.
- The document, application shell, and sidebar explicitly use zero outer margin/padding; the sticky sidebar is anchored to the viewport's inline-start edge and fills its grid track.
- The sidebar shell itself stays at zero margin and padding. A single full-height `sidebar-frame` owns the 12px expanded and 8px compact internal gutter; compact brand, navigation, and account targets are all exactly 48px and the scroll region never adds a second horizontal gutter.
- Context rail: 320px full; 290px compact; hidden at 960px and below to prevent tablet overflow.
- The application canvas is full-viewport; never cap the global shell or center it inside decorative outer gutters. Width constraints belong to readable text and focused controls, not the product frame.
- Game pages use a compact 16px outer gutter; larger spacing belongs between cover, primary content, and context rail rather than outside the rails.

The feed should alternate between expressive/editorial zones and compact working zones. Do not give every section the same gap, card shape, or density.

## Typography

Primary typeface: Inter Variable through `next/font`, followed by the native Apple system stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`) as fallback. Never place Arial before the loaded font. Metadata uses the same Inter family with size, weight, color, and tabular numerals providing hierarchy; avoid code-like monospaced labels in the product interface.

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

### Interaction motion baseline

- Every native button and button-like action link receives a low-specificity motion baseline: 150ms ease-out hover lift/brightness, 90–130ms `scale(.97)` press feedback, animated focus shadow, muted disabled state, and a short icon confirmation when `aria-pressed` becomes true.
- Component-specific motion overrides the baseline through normal CSS specificity; repetitive or precision controls can opt out with `data-motion="none"`. Reduced-motion removes transforms and animations globally while preserving immediate color/opacity feedback.

### Reviews

- Review writing is an editorial state inside the shared journal Radix modal: rating leads in a gold-tinted focus surface with a plain-language descriptor, followed by a controlled 5,000-character writing field and live counter.
- New review text persists as a local per-IGDB draft until a successful save. Spoiler and visibility choices remain stable while switching editor tabs; visibility uses the shared Radix Select language rather than a native browser select.
- Destructive review removal uses an inline two-step confirmation in the sticky footer, never a blocking browser confirm. The review history starts with review count, average rating, session count, and spoiler count; review entries use an inset editorial card distinct from diary rows.

## Navigation Patterns

### Desktop sidebar

- 264px wide, sticky, full viewport height.
- Solid `console-panel` background with `shell-line-strong` right border.
- Brand plus subtle beta stage at top.
- Navigation rows are uniformly 52px high with an 8px radius on desktop, compact, and mobile drawer states; compact icon hit areas are 48px wide inside the 64px rail.
- Current route uses the same persistent graphite surface as hover, with a white icon and label. Do not add a dot, rail, or blurple fill to the selected row.
- Quick-log action is tonal, not a large saturated pill.
- Account control stays at the bottom and must not fabricate authenticated state.
- Signed-out account controls use a neutral login glyph; initials and avatars are reserved for real authenticated profiles.
- Signed-out navigation keeps Home, search, language, and legal documents available. Library, Reviews, Profile, Settings, and quick-log render as non-interactive muted rows with a small lock glyph and an accessible sign-in requirement.
- Above 1100px, the sidebar can collapse from 264px to 64px using a persistent edge control; the compact state keeps 44px icon targets, route state, account access, and the content canvas expansion.

### Compact sidebar

- 64px wide below 1100px.
- Icons remain centered in 44px hit areas.
- Text, keyboard hint, beta label, and account metadata collapse.

### Mobile navigation

- Persistent 60px header with the menu trigger on the left and search on the right; the logo stays inside the drawer instead of occupying the center.
- Sidebar remains available through the menu trigger.
- Do not use a bottom navigation bar; all destinations live in the drawer to avoid competing navigation systems.
- Drawer behavior uses Radix Dialog for focus trapping, Escape handling, focus return, and accessible overlay state.
- Drawer routes, including Settings, use the same persistent graphite selected surface as desktop navigation.
- Mobile drawer width is `min(82vw, 296px)` so it keeps context visible and does not feel like a second full-screen page.
- Drawer animation: 240ms entry, 160ms exit, transform and opacity only.
- The authenticated account control spans the full drawer width at the bottom; compact desktop sidebar rules must never collapse its identity, metadata, or menu chevron.
- The mobile drawer trigger shows the signed-in avatar (or account initial fallback) instead of a hamburger; signed-out visitors keep the menu icon.

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
- Primary save controls use blurple only at the commit point, with a 160ms lift on hover, 0.97 press feedback, visible focus ring, and a clearly muted disabled state.

### Age protection

- Account onboarding has two explicit steps: public username first, immutable birth date second. The progress marker stays compact and subordinate to the form heading.
- Birth date is presented as a dark inset native date control with an explicit permanence confirmation. Safety copy explains the 12-year account minimum and that the date is private.
- A blocked game page never reveals artwork or descriptive content. The official local ClassInd mark is the focal object, followed by the restriction reason and one safe route back to the catalog.
- Blurple remains reserved for authentication or completion actions; protection status uses neutral surfaces and `safe-green` only for the shield marker.
- Anonymous visitors can self-declare birth date inside a protected game gate, similar to storefront age checks. The server stores no raw date: it issues a signed, HttpOnly, 30-day cookie containing only calculated age and issue time.
- Profile settings show the confirmed account birth date as private, read-only information with an explicit permanent-state notice.

### Not found

- The 404 state belongs to the game-library world: a restrained gamepad-orbit object, “fora do mapa” language, and routes back to catalog or browser history.
- Keep the product shell visible. The error surface is centered within the content canvas and uses surface shifts plus quiet borders rather than an oversized promotional illustration.

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

- Home uses a full-width, 440px cinematic IGDB artwork stage inspired by streaming catalog openers; it does not place a separate cover over the art.
- Copy stays anchored at the lower left over a functional dark scrim: one dominant game title, rating/year/genre metadata, a short description, and explicit view/explore actions.
- Description is clamped to three lines.
- Primary action is neutral white; catalog exploration is a quiet translucent secondary action.
- Mobile uses a 390px edge-to-edge stage, shifts artwork focus right, and clamps description to two lines.

### Active shelf

- Five covers across on desktop.
- Horizontal scroll with 126px cover items on mobile.
- Cover ratio 3:4, 7px radius.
- Rank label sits at the bottom-left over the image.
- Save action appears on hover/focus desktop and remains visible on touch devices.
- A saved custom cover is a library-wide preference: every authenticated catalog surface resolves it before the IGDB default.
- Cover cards remain stationary on hover; reveal titles and quick actions through overlays only, without vertical lift.
- Mobile discovery lanes become horizontal snap shelves across the full 0–620px range; cards stay between 112px and 132px so cover art, titles, and three quick-action targets remain usable instead of compressing into a four-column grid.
- Home shelves use user-controlled horizontal carousels with snap, drag/touch scrolling, and quiet 36px previous/next controls. They never auto-advance.
- Home adds live RPG, Shooter, Adventure, Strategy, and Indie catalog lanes from IGDB. Genre lanes use six covers per desktop viewport and touch-sized cards on mobile.
- Every home lane is contained through a zero-minimum-width chain from section to carousel track. Mobile never uses negative outer margins; only the track owns horizontal overflow, keeping the document itself locked to the viewport.
- “Hidden gems” requires an 80+ catalog score, 50–349 ratings, release at least two years ago, main-game type, and no IGDB franchise or collection association; current hits, famous franchise editions, ports, and remasters must not qualify merely because one entry has few ratings.

### Library workspace

- Owner and public profile libraries share one Steam-inspired workspace: identity/banner stage, real collection counts, smart shelves, dense controls, and the active-shelf cover language.
- Smart shelves expose All, Playing, Backlog, Wishlist, Completed, Favorites, and Rated with real counts. Search matches title or genre; sorting supports recent, oldest, personal rating, title, and release year.
- Grid shows 24 games per page; compact list shows 14. Filter, sort, view, query, and page state live in the URL so a public collection view can be shared.
- Every breakpoint uses the same horizontal, touch-scrollable smart-shelf tabs above the results; mobile keeps two cover columns or compact rows with full-width search and pagination actions.
- The owner can switch the library between Public and Private. Public `user_games` reads are enforced by RLS against `profiles.library_visibility`; quick actions and removal never render for visitors.
- Large libraries load IGDB details in batches of 100 rather than silently truncating the collection. Loading mirrors the hero, tools, rail, and cover grid.
- Library filters reuse the game-page tab anatomy exactly: 38px horizontal triggers, quiet hover fill, active underline, compact count badge, and touch scrolling on narrow screens. The former desktop-only vertical rail is retired so owner and public views keep one navigation language at every breakpoint.
- Saved quick actions must read as state, not lighter text: active action buttons use a semantic filled surface, wishlist/backlog/favorite markers remain visible on the cover, and checked Radix menu rows receive a tinted inset surface. Mutations stay quiet unless they fail; inline card feedback handles errors.
- Tracking colors are stable across the game page and cover quick actions: completed green, playing blue, backlog violet, wishlist gold, and liked coral. Active controls pair color with a stronger inset edge, filled surface, `aria-pressed`, and medium label weight so state never depends on hue alone.
- Status menus include an explicit clear action, represented by the existing Backlog sentinel in storage while the UI returns to “Set status”. Card mutations update the collection's local record immediately so counts, shelves, order, and visibility stay synchronized without a refresh.
- Library removal uses a 170ms card exit followed by a 260ms View Transition reflow, with an opacity-only reduced-motion fallback. Sorting uses a Radix Select matching the inset toolbar, and nested mobile menus keep a 12px viewport collision boundary.
- Quick-card state broadcasts locally by IGDB id, keeping duplicate appearances of the same game synchronized within Home, profile, related, and library surfaces. The library hero consumes the same event so total, playing, and rated counts update after mutations and removal.

### Verified identity

- Verified profiles use one compact blurple rosette beside the display name. Activating it explains that verification confirms the represented identity and is not an endorsement.
- The badge follows the account into profile headers and community activity without changing name hierarchy.
- Verification is assigned only by moderators after an external Google Forms review. Profile settings never expose an in-product request form or request status; verified accounts simply receive the public badge across identity surfaces.

### Account settings

- Settings use the same 38px horizontal tab anatomy as game pages: General, Profile, and Security. General owns immutable account identity, birth date, and owner-only infraction standing; Profile owns public copy, imagery, and social usernames; Security owns passkey management.
- Social fields accept usernames only for YouTube, Instagram, and Twitter/X. Settings use the official vector marks beside inputs; public profiles expose only 42px square brand-color logo buttons (YouTube red, Instagram magenta, X black), with no redundant text labels.
- Passkeys use Supabase Auth's experimental passkey API to list, register, and remove device credentials. Security copy explains the device-bound private key and exposes unsupported/disabled states inline.
- Share actions open one motion-polished Radix choice modal: copy the canonical current URL with an animated confirmation, or send exclusively through the native Web Share sheet. When Web Share is unavailable, the send choice is visibly disabled rather than silently changing channels. Profile reports use a separate Radix modal, write to the existing owner-readable reports table, and never render a report action against oneself.
- Mobile profiles preserve the banner/avatar focal point, keep identity actions in normal flow, move social/share/report actions full-width below identity, and turn the six metrics into a contained horizontal snap rail instead of squeezing labels.

### Search recents

- Opening an empty global search shows up to six recently selected games stored only in browser local storage. Rows reuse the standard search result anatomy and include an explicit clear action.

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
- Supported languages use a compact Steam-like comparison table in the overview: languages form rows, interface/audio/subtitle support form fixed columns, green checks indicate availability, and native names remain secondary metadata.

### spawnd game tab

- Every game page exposes a spawnd tab. Confirmed supported titles lead to their official playable demo; unsupported titles show an honest unavailable state and link to the wider catalog.
- Confirmed embed IDs render a responsive 16:9 player inside the tab using spawnd's documented iframe contract. The iframe loads only after an explicit player action, before which no spawnd request is made; an external-page fallback remains available.
- The explainer states that demos run locally in the browser without download, installation, or game streaming.
- Use the official spawnd wordmark and compact mark from local SVG assets. Preserve their orange identity as a partner-brand exception; do not promote orange into the uloggd product palette.
- Supported games expose a compact 40px “Play now” action in the game stage. It activates and focuses the internal spawnd tab instead of navigating away. Search results use a quiet playable badge with the compact mark; both render only when the spawnd catalog contains the exact IGDB ID, never through name, slug, or website inference.
- The spawnd tab uses the official compact mark in navigation and the full wordmark in its primary panel. The playable action remains the focal element, while privacy consent, external fallback, loading, and error states remain explicit.

### Age rating

- Game overviews show available IGDB age ratings at the top of the right context rail, before time-to-beat and similar games.
- The panel maps IGDB's current organization and rating-category names to official local PNG assets under `public/age-ratings/`, based on the legacy uloggd rating mapper. It shows the full organization name and region alongside the mark; a neutral textual badge is only the fallback when no local mark exists.
- Portuguese prioritizes ClassInd, then ESRB and PEGI; English prioritizes ESRB, then PEGI and ClassInd. Show no more than three organizations and omit the panel when IGDB has no rating data.
- Read the current IGDB `organization` and `rating_category` relations; do not add new code against deprecated `category` or `rating` fields.

### Media lightbox

- The full-screen gallery keeps previous/next controls for sequential browsing and adds a bottom thumbnail strip with numbered direct navigation for jumping to any image.
- The active thumbnail uses an emphasis border and full opacity; inactive thumbnails remain subdued. The strip scrolls horizontally on narrow screens without changing the image stage geometry.
- On mobile game stages, the catalog score is a compact horizontal row after the cover/title quick-action area. It must not sit above the cover or compete with the artwork banner.

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

### Social journal

- Reviews and diary sessions remain distinct: a review owns the lasting rating and opinion, while a diary entry records a dated play session, optional duration, and short note.
- Activity rows use a 72px physical cover, compact identity, one activity verb, and optional body content; mobile reduces the cover to 56px instead of flattening the hierarchy.
- Spoilers stay behind an explicit disclosure control, and public feeds never reveal private entries.
- Game pages expose review, session, and list actions as quiet secondary controls below the primary library state.

### Public profiles and lists

- Profiles use a 4:1 banner, overlapping 112px avatar, compact statistic line, active shelf, activity stream, and lists rail; mobile uses a 3:1 banner and 82px avatar.
- A profile thought is a single-line, 100-character status rendered as a compact speech bubble anchored above the avatar. It may overlap the banner, but never the identity or profile actions; mobile constrains it to the viewport.
- Mobile profile actions retain their text label, use a consistent 44px touch target and at least 108px of width; the profile identity truncates before an action can leave the viewport.
- Report dialogs fade their backdrop and enter with a centered scale/offset on desktop or an upward sheet on mobile. Closing always plays the inverse motion before Radix unmounts the surface.
- Verified badges are interactive identity signals. Their modal explains what was confirmed, that moderation assigns the badge after review, and that verification is not an endorsement of published content.
- Workspace headers state each page concept once; eyebrow copy adds context instead of repeating the title. Lists use real collection/game/public counts, a responsive two-column card grid, and a motion-enabled Radix creation dialog with a custom visibility select.
- Verified identity uses the locally stored official blue verification mark across profiles, activity, and signed-in navigation identity.
- Optional TOTP security covers enrollment, QR/manual secret setup, verification, multiple authenticators, protected removal, login challenge, SSR redirects, and database mutation enforcement for accounts whose next assurance level is AAL2.
- Profile counters are navigation, not dead statistics: games open the public library, reviews/sessions open filtered history, lists open the public collection index, and follower counts open the corresponding connection tab.
- The global header is a detached glass surface: desktop uses a wide 56px bar with restrained blur and search space, while mobile uses a compact 54px capsule inset 10px from the viewport. Both retain an opaque fallback when backdrop filters are unavailable.
- On mobile home, the catalog spotlight backdrop starts at the viewport top and passes behind the glass header; its content retains a 64px safe offset so controls never sit beneath navigation.
- Mobile header menu and search triggers use explicit 40×40px boxes with zero inherited padding and optically centered icons; the right-side action cluster uses a fixed 4px gap.
- Workspace headers state each page concept once; eyebrow copy adds context instead of repeating the title. Lists use real collection/game/public counts, a responsive two-column card grid, and a motion-enabled Radix creation dialog with a custom visibility select.
- Profile statistics always use exact database counts rather than the number of preview rows currently rendered. The owner gets a quiet edit action; visitors get a follow control in the same position.
- Profile metadata uses display name/username, bio, and the uploaded banner (avatar fallback) for Open Graph and Twitter embeds.
- List cards emphasize title and description over counts. Detail views reuse active-shelf covers with a small physical index marker for manual order.
- Creating a list is a focused inline form; adding a game remains contextual on the game page.
- List previews lead with a five-column cover strip (empty slots stay tonal), followed by title, visibility, description, and count. This same recognizable object is reused on the lists page and profile rail.
- Owners can edit or delete reviews, diary sessions, and lists without exposing management controls to other viewers. Destructive actions require confirmation and remain visually secondary until hovered.

### Review and journal editor

- Review and Journal share one Radix modal with persistent tabs, game identity in the header, a scrollable form body, and a sticky action footer. Switching tabs never dismisses the surface.
- Desktop uses a centered surface up to 640px; mobile becomes a bottom sheet with safe-area padding. Both keep their mode mounted through the closing animation so the backdrop and surface exit together.
- Diary entries are repeatable sessions, not a single game-level field. “View logs” opens a private per-game timeline with total entries and playtime; every session can be edited or removed independently.

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
