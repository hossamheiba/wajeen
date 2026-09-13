import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

/**
 * The last validation before production: the configuration a deployment
 * actually runs, end to end, on this machine.
 *
 *   CMS    gunicorn, DEBUG off, a secret generated for this run, check --deploy
 *          and collectstatic as boot gates — cms/scripts/production-e2e-api.sh
 *   media  a separate static host, the shape of a CDN in front of the library
 *   site   one production build: studio enabled, text from the CMS
 *
 * Two projects, in order. `editorial` is tests/studio-cms/studio-on-cms.spec.ts
 * unchanged — login, draft, publish to HTML, revisions, preview — now against
 * gunicorn with DEBUG off. `production` depends on it and covers what only a
 * production posture can show: rollback after a real publish, media through a
 * separate host, inquiries and the retry job, cookie flags, and secrets.
 *
 * Same isolation model as every harness since Phase 2A: its own database and
 * temporary roots, `reuseExistingServer: false`, graceful shutdown so cleanup
 * runs. `npm run test:production`.
 */

// Generated once, in the runner, so the CMS signs with them and the tests can
// prove neither reached a browser bundle. Workers inherit the runner's env.
process.env.PROD_E2E_SECRET_KEY ??= randomBytes(48).toString("base64url");
process.env.PROD_E2E_INQUIRY_TOKEN ??= randomBytes(24).toString("base64url");

const graceful = { signal: "SIGTERM" as const, timeout: 15_000 };
const site = { ...devices["Desktop Chrome"], baseURL: "http://localhost:3131" };

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  webServer: [
    {
      command: "bash cms/scripts/production-e2e-api.sh",
      url: "http://localhost:8021/api/v1/content/en/",
      reuseExistingServer: false,
      gracefulShutdown: graceful,
      timeout: 240_000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        DJANGO_SECRET_KEY: process.env.PROD_E2E_SECRET_KEY,
        WJEEN_INQUIRY_TOKEN: process.env.PROD_E2E_INQUIRY_TOKEN,
      },
    },
    {
      command: "bash tests/production/serve.sh",
      url: "http://localhost:3131/en/studio/login",
      reuseExistingServer: false,
      gracefulShutdown: graceful,
      timeout: 300_000,
      stdout: "ignore",
      stderr: "pipe",
      env: { WJEEN_INQUIRY_TOKEN: process.env.PROD_E2E_INQUIRY_TOKEN },
    },
  ],
  projects: [
    { name: "editorial", testMatch: /studio-cms\/studio-on-cms\.spec\.ts/, use: site },
    {
      name: "production",
      testMatch: /production\/production\.spec\.ts/,
      dependencies: ["editorial"],
      use: site,
    },
  ],
});
