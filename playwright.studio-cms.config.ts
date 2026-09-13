import { defineConfig, devices } from "@playwright/test";

/**
 * The studio, driven for real, against a site whose text comes from the CMS.
 *
 * Why this is a second config rather than another project in
 * `playwright.content.config.ts`: the two need *different builds*.
 * `NEXT_PUBLIC_CMS_API_URL` is inlined when it has a value at build time, so a
 * build that enables the studio also freezes every instance's origin — which is
 * exactly what the content harness cannot have, because two of its instances
 * must point at a dead port and a hang stub. One `.next` per project directory
 * means one configuration per run. See tests/studio-cms/serve.sh.
 *
 * Everything else is the isolation model that was agreed in Phase 2A: its own
 * database, its own ports, its own account, `reuseExistingServer: false` so an
 * occupied port is a loud failure rather than a silent wrong answer, and a
 * graceful shutdown so the boot script's cleanup trap actually runs.
 *
 * `npm run test:studio-cms`. Safe to run while :3000 and :8001 are in use.
 */
export default defineConfig({
  testDir: "./tests/studio-cms",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  webServer: [
    {
      command: "bash cms/scripts/content-e2e-api.sh",
      url: "http://localhost:8021/api/v1/content/en/",
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        // Its own database and port, dropped when the run ends.
        POSTGRES_DB: "wjeen_cms_studio_e2e",
        CONTENT_E2E_PORT: "8021",
        // The one origin this harness drives, and the only one Django trusts.
        CORS_ALLOWED_ORIGINS: "http://localhost:3131",
        CSRF_TRUSTED_ORIGINS: "http://localhost:3131",
        WJEEN_PRIVATE_ROOT: "cms/privatefiles-studio-e2e",
      },
    },
    {
      command: "bash tests/studio-cms/serve.sh",
      url: "http://localhost:3131/en/studio/login",
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
      timeout: 300_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "studio-cms",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3131" },
    },
  ],
});
