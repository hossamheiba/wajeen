/**
 * The contact form's destination switch.
 *
 * Frontend only for now: the API has no column for a vendor's answers, so they
 * ride in the message. That is the behaviour worth pinning — nothing a visitor
 * types may be silently dropped on the way out.
 */

import { expect, test, type Page } from "@playwright/test";

/**
 * Click the label, the way a person does. The radio itself is `sr-only` so it
 * can be styled as a card — visually hidden but focusable, which is why the
 * keyboard test drives it directly and this one does not.
 */
const choose = (page: Page, hint: string) => page.getByText(hint).click();

test.describe("contact destination switch", () => {
  test("offers exactly two destinations, Wjeen first", async ({ page }) => {
    await page.goto("/en/contact");
    const group = page.getByRole("group", { name: "Who is this for?" });
    const options = group.getByRole("radio");

    await expect(options).toHaveCount(2);
    await expect(group.getByRole("radio", { name: /Wjeen/ })).toBeChecked();
    await expect(group.getByRole("radio", { name: /Vendor/ })).not.toBeChecked();
  });

  test("Wjeen keeps the original fields and no vendor ones", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Sector of Interest")).toBeVisible();
    await expect(page.getByLabel("Company Name")).toHaveCount(0);
    await expect(page.getByLabel("Commercial Registration")).toHaveCount(0);
  });

  test("Vendor reveals company, supply type and CR", async ({ page }) => {
    await page.goto("/en/contact");
    await choose(page, "Suppliers and subcontractors");

    await expect(page.getByLabel("Company Name")).toBeVisible();
    await expect(page.getByLabel("What do you supply?")).toBeVisible();
    await expect(page.getByLabel("Commercial Registration")).toBeVisible();
    // The shared fields stay.
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
  });

  test("switching back hides the vendor fields again", async ({ page }) => {
    await page.goto("/en/contact");
    await choose(page, "Suppliers and subcontractors");
    await expect(page.getByLabel("Company Name")).toBeVisible();

    await choose(page, "General enquiries");
    await expect(page.getByLabel("Company Name")).toHaveCount(0);
  });

  test("the switch is operable from the keyboard", async ({ page }) => {
    await page.goto("/en/contact");
    await page.getByRole("radio", { name: /Wjeen/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /Vendor/ })).toBeChecked();
    await expect(page.getByLabel("Company Name")).toBeVisible();
  });

  test("nothing a vendor types is dropped — it all reaches the API", async ({ page }) => {
    await page.goto("/en/contact");

    let body: Record<string, string> | null = null;
    await page.route("**/api/contact", async (route) => {
      body = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await choose(page, "Suppliers and subcontractors");
    await page.getByLabel("Full Name").fill("Sara");
    await page.getByLabel("Email Address").fill("sara@supplier.example");
    await page.getByLabel("Company Name").fill("Gulf Steel Co.");
    await page.getByLabel("Commercial Registration").fill("1010101010");
    await page.getByLabel("What do you supply?").selectOption("equipment");
    await page.getByLabel("Message").fill("We would like to be a registered vendor.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect.poll(() => body).not.toBeNull();
    const sent = body as unknown as Record<string, string>;
    expect(sent.name).toBe("Sara");
    for (const fragment of [
      "Vendor enquiry",
      "Gulf Steel Co.",
      "Equipment",
      "1010101010",
      "We would like to be a registered vendor.",
    ]) {
      expect(sent.message, `message should carry "${fragment}"`).toContain(fragment);
    }
  });

  test("a Wjeen message is sent untouched", async ({ page }) => {
    await page.goto("/en/contact");

    let body: Record<string, string> | null = null;
    await page.route("**/api/contact", async (route) => {
      body = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByLabel("Full Name").fill("Omar");
    await page.getByLabel("Email Address").fill("omar@example.com");
    await page.getByLabel("Message").fill("Please send me your company profile.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect.poll(() => body).not.toBeNull();
    expect((body as unknown as Record<string, string>).message).toBe(
      "Please send me your company profile.",
    );
  });

  test("arabic shows the arabic labels", async ({ page }) => {
    await page.goto("/ar/contact");
    await expect(page.getByRole("group", { name: "الرسالة موجهة لمين؟" })).toBeVisible();
    await choose(page, "الموردون والمقاولون من الباطن");
    await expect(page.getByLabel("اسم الشركة")).toBeVisible();
    await expect(page.getByLabel("نوع التوريد")).toBeVisible();
    await expect(page.getByLabel("السجل التجاري")).toBeVisible();
  });
});
