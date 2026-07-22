---
name: build-webpack-on-android
description: This Termux/Android device can't run Turbopack; builds need the --webpack flag
metadata:
  type: reference
---

On this Termux/Android (arm64) device, `next build` and `next dev` fail with "Turbopack is not supported on this platform … Only WebAssembly (WASM) bindings were loaded" because native bindings aren't available.

**How to apply:** Always pass `--webpack` — e.g. `node node_modules/next/dist/bin/next build --webpack`. The `next` bin isn't on PATH, so invoke via `node node_modules/next/dist/bin/next`. `playwright.config.ts` already uses `--webpack` for its dev/build webServer. A full production build takes several minutes here — run it in the background, not inline.
