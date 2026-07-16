# End-to-end tests

The Playwright suite starts Next.js with `ULOGGD_E2E=1`. In that mode, only
the external catalog and anonymous account boundary are replaced by deterministic
fixtures; routing, React interactions, responsive CSS, and URL state use the real
application code.

```sh
npx playwright install chromium
npm run test:e2e
```

Use `npm run test:e2e:ui` for Playwright's interactive runner. Browser binaries
are not published for Android/Termux, so the suite executes in the Ubuntu GitHub
Actions job for this repository.
