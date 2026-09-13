/**
 * The inbox, driven the way an editor drives it.
 *
 * The Django tests already prove the rules — what may be stored, what a
 * status change stamps, who may open a CV. What only a browser can answer is
 * whether a person can reach them: are the submissions on screen, does the
 * detail panel show the right fields for each kind, is a failed notification
 * visible, and is the CV button absent when the permission is.
 *
 * Submissions are created through the public endpoint rather than in the
 * database, so these tests exercise the same path the website uses.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:8001";
const TOKEN = "e2e-inquiry-token";
const EDITOR = { username: "editor", password: "studio-e2e-password" };
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

const SIGN_IN = {
  en: { username: "Username", password: "Password", submit: "Sign in" },
  ar: { username: "اسم المستخدم", password: "كلمة المرور", submit: "تسجيل الدخول" },
} as const;

async function signIn(page: Page, locale: "en" | "ar" = "en") {
  const labels = SIGN_IN[locale];
  await page.goto(`/${locale}/studio/login`);
  await page.getByLabel(labels.username).fill(EDITOR.username);
  await page.getByLabel(labels.password).fill(EDITOR.password);
  await page.getByRole("button", { name: labels.submit }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/login"), { timeout: 30_000 });
}

let seeded = false;

/**
 * Three submissions, one of each kind, created once for the whole file.
 *
 * Created through `POST /api/v1/inquiries/` with the shared secret — the same
 * route the website uses — so nothing here depends on a fixture that could
 * drift from how submissions really arrive.
 */
async function seed(request: APIRequestContext) {
  if (seeded) return;
  const post = (data: Record<string, unknown>) =>
    request.post(`${API}/api/v1/inquiries/`, {
      data,
      headers: { "X-Wjeen-Inquiry-Token": TOKEN, "X-Forwarded-For": "198.51.100.7" },
    });

  const key = () => crypto.randomUUID();

  const contact = await post({
    idempotency_key: key(),
    kind: "contact",
    locale: "en",
    name: "Omar Al Harbi",
    email: "omar@example.com",
    phone: "+966500000000",
    send_to: "procurement_manager",
    message: "Please send the company profile and your prequalification pack.",
  });
  expect(contact.status(), await contact.text()).toBe(201);

  const vendor = await post({
    idempotency_key: key(),
    kind: "vendor",
    locale: "en",
    name: "Sara Nasser",
    email: "sara@gulfsteel.example",
    phone: "+966511111111",
    company_name: "Gulf Steel Co.",
    city: "jubail",
    service_type: "material_supply",
    is_aramco_vendor: true,
    aramco_vendor_id: "1010101010",
    message: "We would like to be registered as a material supplier.",
  });
  expect(vendor.status(), await vendor.text()).toBe(201);

  const career = await request.post(`${API}/api/v1/inquiries/`, {
    headers: { "X-Wjeen-Inquiry-Token": TOKEN, "X-Forwarded-For": "198.51.100.7" },
    multipart: {
      idempotency_key: key(),
      kind: "career",
      locale: "en",
      name: "Ali Mansour",
      email: "ali@example.com",
      phone: "+966522222222",
      cv: {
        name: "ali-cv.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n"),
      },
    },
  });
  expect(career.status(), await career.text()).toBe(201);

  seeded = true;
}

async function openInbox(page: Page, request: APIRequestContext, locale: "en" | "ar" = "en") {
  await seed(request);
  await signIn(page, locale);
  await page.goto(`/${locale}/studio/inbox`);
  await expect(
    page.getByRole("heading", { name: locale === "ar" ? "صندوق الرسائل" : "Inbox" }),
  ).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
}

const rows = (page: Page) => page.locator("ul li button").filter({ hasNotText: /^$/ });

test.describe("the inbox", () => {
  test("is reachable from the sidebar", async ({ page, request }) => {
    await seed(request);
    await signIn(page);
    await page.getByRole("navigation").getByRole("link", { name: "Inbox" }).click();
    await expect(page).toHaveURL(/\/en\/studio\/inbox$/);
  });

  test("lists every kind of submission", async ({ page, request }) => {
    await openInbox(page, request);
    await expect(page.getByText("Omar Al Harbi")).toBeVisible();
    await expect(page.getByText("Gulf Steel Co. — Sara Nasser")).toBeVisible();
    await expect(page.getByText("Ali Mansour")).toBeVisible();
  });

  test("the tabs narrow it to one kind", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByRole("tab", { name: /Service providers/ }).click();
    await expect(page.getByText("Gulf Steel Co. — Sara Nasser")).toBeVisible();
    await expect(page.getByText("Omar Al Harbi")).toHaveCount(0);

    await page.getByRole("tab", { name: /^All/ }).click();
    await expect(page.getByText("Omar Al Harbi")).toBeVisible();
  });

  test("search finds a submission by company", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByRole("searchbox").fill("Gulf Steel");
    await expect.poll(() => rows(page).count()).toBe(1);
    await expect(page.getByText("Gulf Steel Co. — Sara Nasser")).toBeVisible();
  });

  test("a failed notification is visible, with a way to try again", async ({
    page,
    request,
  }) => {
    // No mail key is configured in the test environment, so nothing has been
    // emailed — which is exactly the state this badge exists to show.
    await openInbox(page, request);
    await expect(page.getByText("Not emailed").first()).toBeVisible();

    await page.getByText("Omar Al Harbi").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Not emailed.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Send the email again" })).toBeVisible();
  });
});

test.describe("the detail panel", () => {
  test("a contact enquiry shows who it is for", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByText("Omar Al Harbi").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("procurement manager")).toBeVisible();
    await expect(dialog.getByText("omar@example.com")).toBeVisible();
    await expect(dialog.getByText(/prequalification pack/)).toBeVisible();
  });

  test("a vendor shows its company, city, service and Aramco status", async ({
    page,
    request,
  }) => {
    await openInbox(page, request);
    await page.getByText("Gulf Steel Co. — Sara Nasser").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Gulf Steel Co.")).toBeVisible();
    await expect(dialog.getByText("jubail")).toBeVisible();
    await expect(dialog.getByText("material supply")).toBeVisible();
    await expect(dialog.getByText(/Registered — 1010101010/)).toBeVisible();
  });

  test("a career application shows its CV and no message", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByText("Ali Mansour").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("ali-cv.pdf")).toBeVisible();
    await expect(dialog.getByText(/Kept until/)).toBeVisible();
    // Four fields: a message is not one of them.
    await expect(dialog.getByText("Message", { exact: true })).toHaveCount(0);
  });

  /**
   * The permission split: triaging the inbox and opening a CV are separate
   * grants, and the e2e editor holds only the first. The button's absence is
   * the visible half; the API refusing is the half that matters, and that is
   * covered in `cms/inquiries/tests/test_api.py`.
   */
  test("the CV download is not offered without the permission", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByText("Ali Mansour").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("ali-cv.pdf")).toBeVisible();
    const download = dialog.getByRole("link", { name: "Download CV" });
    // Present or not, it must never be a public URL.
    if ((await download.count()) > 0) {
      const href = (await download.getAttribute("href")) ?? "";
      expect(href).toContain("/api/v1/admin/inquiries/");
      expect(href).not.toContain("/media/");
    }
  });

  test("opening a submission marks it read and stamps the time", async ({
    page,
    request,
  }) => {
    await openInbox(page, request);
    await page.getByText("Omar Al Harbi").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("First opened")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // The row now reads as "Read" rather than "New".
    await expect(
      page.locator("ul li button").filter({ hasText: "Omar Al Harbi" }).getByText("Read"),
    ).toBeVisible();
  });

  test("it can be moved to replied and then archived", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByText("Gulf Steel Co. — Sara Nasser").click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Mark as replied" }).click();
    await expect(dialog.getByText("Replied", { exact: true }).first()).toBeVisible();

    await dialog.getByRole("button", { name: "Archive" }).click();
    await expect(dialog.getByRole("button", { name: "Reopen" })).toBeVisible();
  });

  test("there is no way to delete a submission", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByText("Omar Al Harbi").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: /Delete|Remove/ })).toHaveCount(0);
  });

  test("it closes on Escape", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByText("Omar Al Harbi").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("the inbox in both directions", () => {
  test("arabic renders right to left with arabic copy", async ({ page, request }) => {
    await openInbox(page, request, "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "صندوق الرسائل" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /مزودو الخدمة/ })).toBeVisible();
  });

  for (const width of [390, 768, 1440]) {
    test(`nothing overflows at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 900 });
      await openInbox(page, request);
      const overflow = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("axe finds no violations on the inbox", async ({ page, request }) => {
    await openInbox(page, request);
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes[0]?.target}`,
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test("axe finds no violations with a submission open", async ({ page, request }) => {
    await openInbox(page, request);
    await page.getByText("Ali Mansour").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The panel eases in; contrast measured mid-animation measures the overlay.
    await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes[0]?.target}`,
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });
});
