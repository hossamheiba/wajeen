/**
 * "Message recipients": an editor gives each choice on the contact form its own
 * mailbox, and the dashboard no longer offers what the site no longer shows.
 *
 * The e2e editor is shared, and so is the database behind it. The address test
 * saves one and puts it back in `finally`.
 */

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const API = "http://localhost:8001/api/v1/admin";
const EN = JSON.parse(readFileSync(join(process.cwd(), "src/messages/en.json"), "utf8"));
const NAMED = Object.values(EN.contactPage.form.sendToOptions as Record<string, string>).filter(
  (name) => name.trim() !== "",
);

async function signIn(page: Page) {
  await page.goto("/en/studio/login");
  await page.getByLabel("Username").fill("editor");
  await page.getByLabel("Password").fill("studio-e2e-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/studio\/?$/);
}

/** Put every address back to blank, through the same API the screen uses. */
async function clearAll(page: Page) {
  await page.evaluate(async (api) => {
    const csrf = await (await fetch(`${api}/auth/csrf/`, { credentials: "include" })).json().catch(() => ({}));
    const token = (csrf as { csrfToken?: string }).csrfToken ?? document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
    const current = (await (await fetch(`${api}/inquiries/recipients/`, { credentials: "include" })).json()) as {
      recipients: { code: string }[];
    };
    await fetch(`${api}/inquiries/recipients/`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": token },
      body: JSON.stringify({ recipients: current.recipients.map((r) => ({ code: r.code, email: "" })) }),
    });
  }, API);
}

test.describe.configure({ mode: "serial" });

test("the rail has a Message recipients page that lists the contact form's choices", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Message recipients" }).first().click();
  await expect(page).toHaveURL(/\/en\/studio\/recipients/);
  await expect(page.getByRole("heading", { name: "Message recipients" }).first()).toBeVisible();
  // One field per name the form offers, labelled with that name.
  const inputs = page.locator('input[type="email"]');
  await expect(inputs).toHaveCount(NAMED.length);
  for (const name of NAMED.slice(0, 3)) {
    await expect(page.getByLabel(name, { exact: true })).toBeVisible();
  }
});

test("a malformed address is caught on the page, before anything is sent", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/recipients");
  const first = page.locator('input[type="email"]').first();
  await first.fill("not-an-address");
  let sent = false;
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().includes("/inquiries/recipients/")) sent = true;
  });
  await page.getByRole("button", { name: "Save addresses" }).click();
  await expect(page.getByText("That is not a valid email address.")).toBeVisible();
  expect(sent, "nothing was sent").toBe(false);
});

test("an address is saved, survives a reload, and can be cleared again", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/recipients");
  try {
    const first = page.locator('input[type="email"]').first();
    await expect(page.getByRole("button", { name: "Save addresses" })).toBeDisabled(); // nothing to save yet
    await first.fill("procurement-e2e@wjeen.com");
    await page.getByRole("button", { name: "Save addresses" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

    await page.reload();
    await expect(page.locator('input[type="email"]').first()).toHaveValue("procurement-e2e@wjeen.com");

    // Clearing it sends that choice back to the general mailbox.
    await page.locator('input[type="email"]').first().fill("");
    await expect(page.getByText("General mailbox").first()).toBeVisible();
    await page.getByRole("button", { name: "Save addresses" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
    await page.reload();
    await expect(page.locator('input[type="email"]').first()).toHaveValue("");
  } finally {
    await clearAll(page);
  }
});

test("the page is in Arabic, and mirrors, for an Arabic editor", async ({ page }) => {
  await page.goto("/ar/studio/login");
  await page.getByLabel("اسم المستخدم").fill("editor");
  await page.getByLabel("كلمة المرور").fill("studio-e2e-password");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/ar\/studio\/?$/);
  await page.goto("/ar/studio/recipients");
  await expect(page.getByRole("heading", { name: "جهات استقبال الرسائل" }).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  // An email address is typed left to right in both languages.
  await expect(page.locator('input[type="email"]').first()).toHaveAttribute("dir", "ltr");
});

test("sections the site no longer shows are not offered in the dashboard", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/sections");
  const names = await page.locator("main a[href*='/studio/']").allInnerTexts();
  const text = names.join("\n");
  expect(text).not.toContain("About Teaser");
  expect(text).not.toContain("Resources");
  for (const gone of ["aboutPreview", "resources"]) {
    const response = await page.goto(`/en/studio/${gone}`);
    // Not a section any more: the studio answers as it does for any unknown one.
    await expect(page.getByRole("heading", { name: /Edit|Section/i }), gone).toHaveCount(0);
    expect(response?.status() === 404 || (await page.locator("input, textarea").count()) === 0, gone).toBe(true);
  }
});

test("the story's timeline and the safety figures are not editable", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/aboutStory");
  await expect(page.getByLabel("Body 1").or(page.getByLabel("Intro paragraph")).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Establishment of Fal Arabia", { exact: false })).toHaveCount(0);
  await expect(page.locator("summary", { hasText: /milestone/i })).toHaveCount(0);
  await page.goto("/en/studio/safetyHSE");
  await expect(page.locator("textarea, input[type=text]").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("summary", { hasText: /^\s*(Figures|Stats|Statistics)/i })).toHaveCount(0);
});
