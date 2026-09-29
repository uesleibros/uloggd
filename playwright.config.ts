import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  /*
   * CI builds the site before serving it; a local run serves it from `next
   * dev`, which compiles each route the first time somebody asks for it. That
   * first ask costs fifteen to twenty seconds on a cold cache, and every
   * `npm run build` empties the cache again, so the first test to touch a
   * route was spending most of the default budget on the compiler and failing
   * on whatever it was actually checking. The tests pass on the second run,
   * which is the worst possible signal: a suite that is only honest when it is
   * warm.
   *
   * CI keeps the default, because there is nothing to compile there and a slow
   * test is a real finding.
   */
  timeout: process.env.CI ? 30_000 : 90_000,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // localhost, not 127.0.0.1, though they are the same machine. `next dev`
    // treats the two as different origins and refuses to serve /_next/* to the
    // one it was not started on, so the client chunks never arrived and nothing
    // on the page hydrated: every test that clicked something failed, and the
    // ones that only read the server's HTML passed, which made it look like a
    // handful of unrelated components were broken.
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? "npm run build -- --webpack && npm run start -- -p 3100"
      : "npm run dev -- --webpack -p 3100",
    url: "http://localhost:3100/pt-BR/search",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      ULOGGD_E2E: "1",
    },
  },
});
