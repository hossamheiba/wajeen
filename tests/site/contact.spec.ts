/**
 * The contact form, in all three kinds.
 *
 * What changed from the version this replaces, and why it is not a regression:
 * there used to be two destinations and the vendor's answers were folded into
 * the message text, because the API had no field for them. There are now three
 * kinds and every answer is a real field with a real column. The old
 * assertions pinned that workaround; these pin the thing it stood in for.
 *
 * The rules worth watching are the conditional ones — the Aramco vendor number
 * that exists only when a box is ticked, and the CV that only a career
 * application may carry. Both are checked here as a visitor experiences them,
 * and again in `cms/inquiries/tests/` against the database.
 */

import { expect, test, type Page } from "@playwright/test";

/**
 * Labels that are substrings of other labels need exact matching: "Message" is
 * inside "Send message to", and the same pair clashes in Arabic.
 */
/** Click the label, the way a person does: the radio itself is `sr-only`. */
const choose = (page: Page, hint: string) => page.getByText(hint, { exact: true }).click();

const CONTACT = "General enquiries";
const VENDOR = "Suppliers and subcontractors";
const CAREER = "Send us your CV";

/** Intercept the submission and hand back the body the page sent. */
async function captureSubmission(page: Page) {
  const captured: { body: string | null; contentType: string } = {
    body: null,
    contentType: "",
  };
  await page.route("**/api/contact", async (route) => {
    captured.body = route.request().postData();
    captured.contentType = route.request().headers()["content-type"] ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, id: 1 }),
    });
  });
  return captured;
}

test.describe("the kind switch", () => {
  test("offers three kinds, Contact Wjeen first", async ({ page }) => {
    await page.goto("/en/contact");
    const group = page.getByRole("group", { name: "What is this about?" });
    const options = group.getByRole("radio");

    await expect(options).toHaveCount(3);
    await expect(group.getByRole("radio", { name: /Contact Wjeen/ })).toBeChecked();
    await expect(group.getByRole("radio", { name: /Service provider/ })).not.toBeChecked();
    await expect(group.getByRole("radio", { name: /Careers/ })).not.toBeChecked();
  });

  test("Contact Wjeen asks for a recipient and no longer asks for a sector", async ({
    page,
  }) => {
    await page.goto("/en/contact");
    await expect(page.getByLabel("Full Name", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Send message to", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
    // Removed by decision: Contact Wjeen adds a recipient and nothing else.
    await expect(page.getByLabel("Sector of Interest", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Company Name", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Your CV", { exact: true })).toHaveCount(0);
  });

  test("Service provider reveals company, city, service and the Aramco box", async ({
    page,
  }) => {
    await page.goto("/en/contact");
    await choose(page, VENDOR);

    await expect(page.getByLabel("Company Name", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Contact Person", { exact: true })).toBeVisible();
    await expect(page.getByLabel("City", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Service Type", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /registered Saudi Aramco vendor/ }),
    ).toBeVisible();
    // And the recipient belongs to the other kind.
    await expect(page.getByLabel("Send message to", { exact: true })).toHaveCount(0);
  });

  test("Careers asks for four things and no message", async ({ page }) => {
    await page.goto("/en/contact");
    await choose(page, CAREER);

    await expect(page.getByLabel("Full Name", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email Address", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Phone Number", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Your CV", { exact: true })).toBeVisible();
    // Four fields — a message is deliberately not one of them.
    await expect(page.getByLabel("Message", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Send message to", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Company Name", { exact: true })).toHaveCount(0);
  });

  test("switching back hides the fields that belonged to the other kind", async ({
    page,
  }) => {
    await page.goto("/en/contact");
    await choose(page, VENDOR);
    await expect(page.getByLabel("Company Name", { exact: true })).toBeVisible();

    await choose(page, CONTACT);
    await expect(page.getByLabel("Company Name", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Send message to", { exact: true })).toBeVisible();
  });

  test("the switch is operable from the keyboard", async ({ page }) => {
    await page.goto("/en/contact");
    await page.getByRole("radio", { name: /Contact Wjeen/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /Service provider/ })).toBeChecked();
    await expect(page.getByLabel("Company Name", { exact: true })).toBeVisible();
  });
});

test.describe("the Aramco vendor number", () => {
  test("is hidden until the box is ticked", async ({ page }) => {
    await page.goto("/en/contact");
    await choose(page, VENDOR);

    const box = page.getByRole("checkbox", { name: /registered Saudi Aramco vendor/ });
    await expect(box).not.toBeChecked();
    await expect(page.getByLabel("Aramco Vendor Number", { exact: true })).toHaveCount(0);

    await box.check();
    await expect(page.getByLabel("Aramco Vendor Number", { exact: true })).toBeVisible();

    await box.uncheck();
    await expect(page.getByLabel("Aramco Vendor Number", { exact: true })).toHaveCount(0);
  });

  test("is required once the box is ticked", async ({ page }) => {
    await page.goto("/en/contact");
    await choose(page, VENDOR);
    await page.getByRole("checkbox", { name: /registered Saudi Aramco vendor/ }).check();

    await page.getByLabel("Contact Person", { exact: true }).fill("Sara");
    await page.getByLabel("Email Address", { exact: true }).fill("sara@supplier.example");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966511111111");
    await page.getByLabel("Company Name", { exact: true }).fill("Gulf Steel Co.");
    await page.getByLabel("City", { exact: true }).selectOption("jubail");
    await page.getByLabel("Service Type", { exact: true }).selectOption("material_supply");
    await page.getByLabel("Message", { exact: true }).fill("We would like to be a registered vendor.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect(page.getByText("Please enter your Aramco vendor number")).toBeVisible();
  });

  /**
   * The rule that matters most: with the box unticked no vendor number travels
   * at all. Not "", not a placeholder. The database refuses to store one, so
   * sending a value would be a claim about what was collected.
   */
  test("no value is sent for it when the box is not ticked", async ({ page }) => {
    await page.goto("/en/contact");
    const captured = await captureSubmission(page);
    await choose(page, VENDOR);

    await page.getByLabel("Contact Person", { exact: true }).fill("Sara");
    await page.getByLabel("Email Address", { exact: true }).fill("sara@supplier.example");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966511111111");
    await page.getByLabel("Company Name", { exact: true }).fill("Gulf Steel Co.");
    await page.getByLabel("City", { exact: true }).selectOption("jubail");
    await page.getByLabel("Service Type", { exact: true }).selectOption("material_supply");
    await page.getByLabel("Message", { exact: true }).fill("We would like to be a registered vendor.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect.poll(() => captured.body).not.toBeNull();
    const sent = JSON.parse(captured.body!);
    expect(sent.is_aramco_vendor).toBe(false);
    expect(sent.aramco_vendor_id).toBeUndefined();
  });

  test("the number is sent when the box is ticked", async ({ page }) => {
    await page.goto("/en/contact");
    const captured = await captureSubmission(page);
    await choose(page, VENDOR);
    await page.getByRole("checkbox", { name: /registered Saudi Aramco vendor/ }).check();

    await page.getByLabel("Contact Person", { exact: true }).fill("Sara");
    await page.getByLabel("Email Address", { exact: true }).fill("sara@supplier.example");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966511111111");
    await page.getByLabel("Company Name", { exact: true }).fill("Gulf Steel Co.");
    await page.getByLabel("City", { exact: true }).selectOption("jubail");
    await page.getByLabel("Service Type", { exact: true }).selectOption("material_supply");
    await page.getByLabel("Aramco Vendor Number", { exact: true }).fill("1010101010");
    await page.getByLabel("Message", { exact: true }).fill("We would like to be a registered vendor.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect.poll(() => captured.body).not.toBeNull();
    const sent = JSON.parse(captured.body!);
    expect(sent.is_aramco_vendor).toBe(true);
    expect(sent.aramco_vendor_id).toBe("1010101010");
  });
});

test.describe("what reaches the API", () => {
  /**
   * The successor to "nothing a vendor types is dropped". It used to check
   * that the answers survived inside the message text; now it checks they
   * arrive as fields, which is what the message workaround stood in for.
   */
  test("every vendor answer arrives as its own field, not inside the message", async ({
    page,
  }) => {
    await page.goto("/en/contact");
    const captured = await captureSubmission(page);
    await choose(page, VENDOR);

    await page.getByLabel("Contact Person", { exact: true }).fill("Sara");
    await page.getByLabel("Email Address", { exact: true }).fill("sara@supplier.example");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966511111111");
    await page.getByLabel("Company Name", { exact: true }).fill("Gulf Steel Co.");
    await page.getByLabel("City", { exact: true }).selectOption("jubail");
    await page.getByLabel("Service Type", { exact: true }).selectOption("equipment_rental");
    await page.getByLabel("Message", { exact: true }).fill("We would like to be a registered vendor.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect.poll(() => captured.body).not.toBeNull();
    const sent = JSON.parse(captured.body!);
    expect(sent.kind).toBe("vendor");
    expect(sent.company_name).toBe("Gulf Steel Co.");
    expect(sent.city).toBe("jubail");
    expect(sent.service_type).toBe("equipment_rental");
    expect(sent.name).toBe("Sara");
    // The message carries the message and nothing else.
    expect(sent.message).toBe("We would like to be a registered vendor.");
    expect(sent.message).not.toContain("Gulf Steel");
  });

  test("a recipient is sent as a code, not as its label", async ({ page }) => {
    await page.goto("/en/contact");
    const captured = await captureSubmission(page);

    await page.getByLabel("Full Name", { exact: true }).fill("Omar");
    await page.getByLabel("Email Address", { exact: true }).fill("omar@example.com");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966500000000");
    await page.getByLabel("Send message to", { exact: true }).selectOption("procurement_manager");
    await page.getByLabel("Message", { exact: true }).fill("Please send the company profile.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect.poll(() => captured.body).not.toBeNull();
    const sent = JSON.parse(captured.body!);
    expect(sent.send_to).toBe("procurement_manager");
    expect(sent.kind).toBe("contact");
  });

  test("a career application is sent as multipart with the file", async ({ page }) => {
    await page.goto("/en/contact");
    const captured = await captureSubmission(page);
    await choose(page, CAREER);

    await page.getByLabel("Full Name", { exact: true }).fill("Ali");
    await page.getByLabel("Email Address", { exact: true }).fill("ali@example.com");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966522222222");
    await page.getByLabel("Your CV", { exact: true }).setInputFiles({
      name: "cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n"),
    });
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect.poll(() => captured.contentType).toContain("multipart/form-data");
    expect(captured.body).toContain("cv.pdf");
    expect(captured.body).toContain("career");
  });

  test("each submission carries its own idempotency key", async ({ page }) => {
    await page.goto("/en/contact");
    const keys: string[] = [];
    await page.route("**/api/contact", async (route) => {
      const body = route.request().postData();
      if (body) keys.push(JSON.parse(body).idempotency_key);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: keys.length }),
      });
    });

    const send = async (message: string) => {
      await page.getByLabel("Full Name", { exact: true }).fill("Omar");
      await page.getByLabel("Email Address", { exact: true }).fill("omar@example.com");
      await page.getByLabel("Phone Number", { exact: true }).fill("+966500000000");
      await page.getByLabel("Send message to", { exact: true }).selectOption("ceo");
      await page.getByLabel("Message", { exact: true }).fill(message);
      await page.getByRole("button", { name: "Send Message" }).click();
    };

    await send("The first enquiry, long enough to pass.");
    await expect.poll(() => keys.length).toBe(1);
    // Wait for the form to acknowledge and reset before refilling it: the
    // reset is what hands out the next key, so filling before it lands would
    // be testing a half-submitted form.
    await expect(page.getByRole("status")).toContainText("Thank you");

    await send("The second enquiry, also long enough.");
    await expect.poll(() => keys.length).toBe(2);

    // A retry of one submission reuses its key; two submissions must not.
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

test.describe("required fields", () => {
  test("a phone number is required for every kind", async ({ page }) => {
    for (const [hint, extra] of [
      [CONTACT, async () => {
        await page.getByLabel("Send message to", { exact: true }).selectOption("ceo");
        await page.getByLabel("Message", { exact: true }).fill("A long enough message here.");
      }],
      [VENDOR, async () => {
        await page.getByLabel("Company Name", { exact: true }).fill("Gulf Steel Co.");
        await page.getByLabel("Contact Person", { exact: true }).fill("Sara");
        await page.getByLabel("City", { exact: true }).selectOption("jubail");
        await page.getByLabel("Service Type", { exact: true }).selectOption("manpower");
        await page.getByLabel("Message", { exact: true }).fill("A long enough message here.");
      }],
    ] as const) {
      await page.goto("/en/contact");
      await choose(page, hint);
      if (hint === CONTACT) {
        await page.getByLabel("Full Name", { exact: true }).fill("Someone");
      }
      await page.getByLabel("Email Address", { exact: true }).fill("a@example.com");
      await extra();
      await page.getByRole("button", { name: "Send Message" }).click();
      await expect(page.getByText("Please enter a phone number")).toBeVisible();
    }
  });

  test("a career application will not send without a CV", async ({ page }) => {
    await page.goto("/en/contact");
    await choose(page, CAREER);
    await page.getByLabel("Full Name", { exact: true }).fill("Ali");
    await page.getByLabel("Email Address", { exact: true }).fill("ali@example.com");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966522222222");
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText("Please attach your CV")).toBeVisible();
  });

  test("a recipient is required for a general enquiry", async ({ page }) => {
    await page.goto("/en/contact");
    await page.getByLabel("Full Name", { exact: true }).fill("Omar");
    await page.getByLabel("Email Address", { exact: true }).fill("omar@example.com");
    await page.getByLabel("Phone Number", { exact: true }).fill("+966500000000");
    await page.getByLabel("Message", { exact: true }).fill("A long enough message here.");
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText("Please choose who this is for")).toBeVisible();
  });
});

test.describe("both languages", () => {
  test("arabic shows the arabic labels and options", async ({ page }) => {
    await page.goto("/ar/contact");
    await expect(page.getByRole("group", { name: "الرسالة بخصوص؟" })).toBeVisible();
    await expect(page.getByLabel("إرسال الرسالة إلى", { exact: true })).toBeVisible();

    await choose(page, "الموردون والمقاولون من الباطن");
    await expect(page.getByLabel("اسم الشركة", { exact: true })).toBeVisible();
    await expect(page.getByLabel("المدينة", { exact: true })).toBeVisible();
    await expect(page.getByLabel("نوع الخدمة", { exact: true })).toBeVisible();
  });

  test("a code is stored, not the arabic label", async ({ page }) => {
    await page.goto("/ar/contact");
    const captured = await captureSubmission(page);

    await page.getByLabel("الاسم الكامل", { exact: true }).fill("عمر");
    await page.getByLabel("البريد الإلكتروني", { exact: true }).fill("omar@example.com");
    await page.getByLabel("رقم الهاتف", { exact: true }).fill("+966500000000");
    await page.getByLabel("إرسال الرسالة إلى", { exact: true }).selectOption("quality_manager");
    await page.getByLabel("الرسالة", { exact: true }).fill("أرجو إرسال ملف الشركة التعريفي.");
    await page.getByRole("button", { name: "إرسال الرسالة" }).click();

    await expect.poll(() => captured.body).not.toBeNull();
    expect(JSON.parse(captured.body!).send_to).toBe("quality_manager");
  });
});
