import { defineConfig, devices } from "@playwright/test";

/**
 * The content pipeline, end to end: draft → preview → publish → public API →
 * public website.
 *
 * A separate config rather than more projects in `playwright.config.ts`, for
 * two reasons that are both about not breaking what already works:
 *
 *  - Playwright starts every `webServer` for every run, so folding six more
 *    processes into the main config would make even `--project=logic` boot a
 *    CMS and four sites.
 *  - These tests publish and roll back content. They need a database nothing
 *    else shares, and they must be impossible to point at the wrong one.
 *
 * `reuseExistingServer: false` everywhere is the whole isolation story. The
 * main suite reuses whatever answers on :8001, which is how a review server
 * left running on the development database once absorbed a studio run and
 * produced twenty-five false failures. Here, an occupied port is a loud
 * failure instead of a silent wrong answer.
 *
 * Run it with `npm run test:content`. It is safe to do so while `next dev` is
 * on :3000 and a CMS is on :8001 — nothing here uses either port.
 */
export default defineConfig({
  testDir: "./tests/content",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  // Publishing, revalidating and a deliberate 1.5s timeout all happen inside
  // single tests here.
  timeout: 120_000,
  reporter: [["list"]],
  webServer: [
    {
      command: "bash cms/scripts/content-e2e-api.sh",
      url: "http://localhost:8011/api/v1/content/en/",
      reuseExistingServer: false,
      // Playwright SIGKILLs a web server by default, which would step straight
      // over the script's cleanup trap and leave the test database behind.
      gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "bash tests/content/serve.sh",
      // The last instance to be started, so this answering means all five do.
      url: "http://localhost:3114/en",
      reuseExistingServer: false,
      // Same reason: the serve script has to get the signal to kill the five
      // `next start` processes and the stub it started.
      gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
      timeout: 300_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "content",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
