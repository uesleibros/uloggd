import { defineConfig, devices } from "@playwright/test";

/**
 * Serve the site the way it is served in production rather than from the
 * development server. Always on in CI; locally it is `npm run test:e2e:built`.
 */
const built = Boolean(process.env.CI || process.env.ULOGGD_E2E_BUILT);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  /*
   * Which server the suite is talking to, which is the only thing the numbers
   * below depend on.
   *
   * A built server answers from a compiled bundle. A `next dev` server
   * compiles each route the first time somebody asks for it, which costs
   * fifteen to twenty seconds on a cold cache, and every `npm run build`
   * empties that cache again. So against dev, the first test to touch a route
   * spent most of its budget on the compiler and failed on whatever it was
   * actually checking, then passed on a second run: a suite that is only
   * honest when it is warm.
   *
   * CI always builds. Locally `npm run test:e2e:built` does the same, and is
   * the way to get an answer worth trusting from one run.
   */
  timeout: built ? 30_000 : 90_000,
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
    command: built
      ? "npm run build -- --webpack && npm run start -- -p 3100"
      : "npm run dev -- --webpack -p 3100",
    url: "http://localhost:3100/pt-BR/search",
    /*
     * A built run never reuses a server it did not start. A dev server left
     * over from a previous run would answer, and it would answer from source
     * that may no longer be what is on disk, which is the one thing a built
     * run exists to rule out.
     */
    reuseExistingServer: !built,
    timeout: 420_000,
    env: {
      ...process.env,
      ULOGGD_E2E: "1",
    },
  },
});
