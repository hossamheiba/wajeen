import { defineConfig, devices } from "@playwright/test";

/**
 * Two kinds of test, one runner.
 *
 * `logic` needs no browser and no servers: it checks the registry, the path
 * helpers and the field inference — the parts that decide whether an edit can
 * silently lose content.
 *
 * `studio` drives a real browser against a real Next server and a real Django
 * server, because cookies, CSRF and CORS only mean anything over real HTTP.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: [["list"]],
  webServer: [
    {
      command: "bash cms/scripts/e2e-api.sh",
      url: "http://localhost:8001/api/v1/content/en/",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      // A different origin on the same site, exactly like www ↔ api in
      // production: cookies are same-site, requests are cross-origin, so
      // CORS and CSRF both have to be right for anything to work.
      command: "bash tests/studio/serve.sh",
      url: "http://localhost:3100/en/studio/login",
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      stdout: "ignore",
      stderr: "pipe",
      env: { NEXT_PUBLIC_CMS_API_URL: "http://localhost:8001" },
    },
  ],
  projects: [
    {
      name: "logic",
      testMatch: /logic\.spec\.ts/,
    },
    {
      name: "site",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3100" },
    },
    {
      name: "studio",
      testMatch: /(flow|ui)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3100" },
    },
  ],
});
