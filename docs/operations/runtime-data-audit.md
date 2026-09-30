# Runtime data and configuration audit

## Removed in September 2026

- Copyright and release-window examples no longer freeze the interface in 2026. The server passes the current year to the catalogue, so the first client render uses the same value.
- Contact and suspension appeal addresses derive from `NEXT_PUBLIC_SITE_URL`. Optional `CONTACT_EMAIL` and `SUPPORT_EMAIL` override the derived mailboxes. Set these explicitly when a preview or local deployment should link to the production support team.
- Canonical URLs, import identification, push contact and the screenshot API example use deployment configuration. Import identification does not trust the inbound request hostname.
- Public origins must be HTTP or HTTPS origins without credentials, paths, queries or fragments. Invalid configuration fails explicitly.
- The search adapter retains the fields the cards actually receive. It no longer invents empty companies, engines, platforms or a zero hype count to construct a larger game object.
- Unused genre shelves and their fixtures were deleted. They contained a fixed selection of IGDB genre IDs and had no callers. The active genre filters continue reading the catalogue.
- Catalogue page size, page bounds, sort values, selection limits and release-year bounds have one policy module. API rate quotas are shared between enforcement and the documentation.
- Fractional pages and release years are rejected by the shared URL reader instead of producing fractional catalogue offsets or dates.
- Playwright loads the same environment files as Next. Signed-in specs no longer silently skip because only the server read `.env.local`. The API browser test no longer depends on a particular production username.
- The search loading test checks visible placeholders. Next can temporarily retain hidden copies of streamed markup, which must not be counted as additional visible results.

## Values that still belong in source

Translations, published legal revision dates, brand links, protocol identifiers, enums, security allowlists and explicit product limits are real definitions. They must not become untrusted remote input merely to reduce the number of literals. E2E fixtures intentionally contain stable test data and are isolated by the existing E2E configuration.

This audit does not claim that every source literal has been removed. Future changes should distinguish live content from product policy and test data, and use the existing source of truth before adding another copy.

## Validation

- `npx tsc --noEmit`, `npx eslint .`, `npm run test:unit` and `npm run build` passed. There were 348 passing unit tests. Lint retains the existing image-element warning in the yearly Open Graph card.
- Built E2E specs ran separately on desktop Chromium with one worker, clearing port 3100 before each run: `search` passed 16 tests (one mobile-only skip), `api-only-browser` passed four, and `signed-in-flows --repeat-each=4` passed 24.
- The search run used an alternate `CONTACT_EMAIL` to verify the footer and legal text use configuration. It also checked the current year and the configured origin in the API upload example.
