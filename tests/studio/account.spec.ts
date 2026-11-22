/**
 * "My account": an editor changes their own password, through a real browser
 * against the real API.
 *
 * The suite shares one seeded editor, so whatever a test changes it changes
 * back — in `finally`, so a failed assertion cannot leave every later test
 * unable to sign in.
 */

import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:8001";
const EDITOR = { username: "editor", password: "studio-e2e-password" };
const REPLACEMENT = "a-brand-new-passphrase-73";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, locale = "en", password = EDITOR.password) {
  await page.goto(`/${locale}/studio/login`);
  await page.locator("#username").fill(EDITOR.username);
  await page.locator("#password").fill(password);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/login"), { timeout: 30_000 });
}

/** The API call itself, from the signed-in page: used only to put things back. */
async function setPassword(page: Page, from: string, to: string) {
  return page.evaluate(
    async ({ api, from, to }) => {
      const csrf = await (
        await fetch(`${api}/api/v1/admin/auth/csrf/`, { credentials: "include" })
      ).json();
      const response = await fetch(`${api}/api/v1/admin/account/password/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.csrfToken },
        body: JSON.stringify({ current_password: from, new_password: to }),
      });
      return response.status;
    },
    { api: API, from, to },
  );
}

async function fill(page: Page, current: string, next: string, confirm: string) {
  await page.locator("#current-password").fill(current);
  await page.locator("#new-password").fill(next);
  await page.locator("#confirm-password").fill(confirm);
  await page.locator("form button[type=submit]").click();
}

test("the signed-in name in the rail opens My account", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: /editor/i }).filter({ hasText: "Editor" }).click();
  await expect(page).toHaveURL(/\/en\/studio\/account$/);
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
  await expect(page.getByText(EDITOR.username, { exact: true }).first()).toBeVisible();
});

test("a wrong current password says so and does not sign the editor out", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/account");
  await fill(page, "not-my-password", REPLACEMENT, REPLACEMENT);
  await expect(page.locator("form [role=alert]")).toHaveText("The current password is not correct.");
  // Still signed in: the page did not bounce to the login screen.
  await expect(page).toHaveURL(/\/en\/studio\/account$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
});

test("two different new passwords are caught before anything is sent", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/account");
  let sent = false;
  page.on("request", (request) => {
    if (request.url().includes("/account/password/")) sent = true;
  });
  await fill(page, EDITOR.password, REPLACEMENT, `${REPLACEMENT}x`);
  await expect(page.locator("form [role=alert]")).toHaveText("The two new passwords are not the same.");
  expect(sent).toBe(false);
});

test("a weak or unchanged password is refused, in the editor's language", async ({ page }) => {
  await signIn(page, "ar");
  await page.goto("/ar/studio/account");
  await expect(page.getByRole("heading", { name: "حسابي" })).toBeVisible();

  await fill(page, EDITOR.password, "password123", "password123");
  await expect(page.locator("form [role=alert]")).toHaveText("كلمة المرور هذه شائعة جدًا. اختر كلمة يصعب تخمينها.");

  await fill(page, EDITOR.password, "84729516304815", "84729516304815");
  await expect(page.locator("form [role=alert]")).toHaveText("لا يمكن أن تتكوّن كلمة المرور الجديدة من أرقام فقط.");

  await fill(page, EDITOR.password, EDITOR.password, EDITOR.password);
  await expect(page.locator("form [role=alert]")).toHaveText("يجب أن تختلف كلمة المرور الجديدة عن الحالية.");
});

test("the password changes, the fields clear, and the new one signs in while the old one does not", async ({
  page,
  browser,
}) => {
  await signIn(page);
  await page.goto("/en/studio/account");
  try {
    await fill(page, EDITOR.password, REPLACEMENT, REPLACEMENT);
    await expect(page.locator("form [role=status]")).toContainText("Your password was changed");
    await expect(page.locator("#current-password")).toHaveValue("");
    await expect(page.locator("#new-password")).toHaveValue("");
    // Still signed in here.
    await page.reload();
    await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();

    // A fresh browser: the new password works…
    const fresh = await browser.newContext();
    const other = await fresh.newPage();
    await signIn(other, "en", REPLACEMENT);
    await expect(other).not.toHaveURL(/\/studio\/login/);
    // …and the old one is turned away.
    const stranger = await browser.newContext();
    const refused = await stranger.newPage();
    await refused.goto("/en/studio/login");
    await refused.locator("#username").fill(EDITOR.username);
    await refused.locator("#password").fill(EDITOR.password);
    await refused.locator("form button[type=submit]").click();
    await expect(refused.locator("form [role=alert]")).toBeVisible();
    await fresh.close();
    await stranger.close();
  } finally {
    // Put it back so the rest of the suite can sign in.
    const status = await setPassword(page, REPLACEMENT, EDITOR.password);
    if (status !== 200 && status !== 400) throw new Error(`could not restore the editor password (${status})`);
  }
});
