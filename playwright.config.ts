import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
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
