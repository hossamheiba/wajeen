import { NextResponse } from "next/server";
import { inquiryFormSchema, payloadFor } from "@/lib/contactSchema";
import { sendInquiryEmail, type InquiryNotification } from "@/lib/mailer";
import {
  InquiryStoreError,
  reportNotification,
  storeInquiry,
} from "@/lib/inquiryStore";
import { clientKey, rateLimit } from "@/lib/rateLimit";

/**
 * The one way a submission enters the system.
 *
 * The order of the two side effects is the whole design, and it is the
 * opposite of what this handler used to do:
 *
 *   1. **store it in the CMS.** If that fails the visitor gets an error and
 *      the email is never attempted. Nothing is claimed that did not happen.
 *   2. **send the notification.** If *that* fails the visitor still gets
 *      success — their message is stored and the team will see it — and the
 *      failure is recorded on the row, shown in the inbox as "not emailed",
 *      and retried.
 *
 * The old handler sent the email and treated storage as best-effort, which
 * meant a storage failure was a log line while the visitor was thanked. That
 * is what made the dashboard unreliable, and it is why the order is now fixed
 * and stated here rather than left to be inferred.
 *
 * Everything in front of both steps is unchanged: the rate limit runs before
 * parsing, the honeypot answers exactly as a success would, and the schema is
 * the same one the browser validated against.
 */

/** Kept identical to a success so a bot learns nothing from the difference. */
const SILENT_OK = { ok: true } as const;

function badRequest(errors: Record<string, string[] | undefined>) {
  return NextResponse.json({ ok: false, errors }, { status: 400 });
}

export async function POST(request: Request) {
  // Rate limit before parsing: a flood should cost as little as possible.
  // This is the in-process limiter; Django applies a second, shared one.
  const limited = rateLimit(clientKey(request));
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, errors: {} },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let fields: Record<string, unknown>;
  let cv: File | null = null;

  if (isMultipart) {
    const form = await request.formData().catch(() => null);
    if (!form) return badRequest({});
    fields = Object.fromEntries(
      [...form.entries()].filter(([, value]) => typeof value === "string"),
    );
    // Checkboxes arrive as "true"/"false" strings through FormData.
    if (typeof fields.isAramcoVendor === "string") {
      fields.isAramcoVendor = fields.isAramcoVendor === "true";
    }
    const file = form.get("cv");
    cv = file instanceof File && file.size > 0 ? file : null;
  } else {
    const body = await request.json().catch(() => null);
    if (body === null || typeof body !== "object") return badRequest({});
    fields = body as Record<string, unknown>;
  }

  const parsed = inquiryFormSchema.safeParse(fields);
  if (!parsed.success) {
    return badRequest(parsed.error.flatten().fieldErrors);
  }

  const values = parsed.data;

  // Honeypot tripped. Answer exactly as a success would, so the bot learns
  // nothing about why nothing happened — and store nothing, send nothing.
  if (values.company && values.company.trim() !== "") {
    return NextResponse.json(SILENT_OK);
  }

  // A career submission is the only one that must carry a file, and the only
  // one that may. The bytes are checked by the CMS, from the bytes.
  if (values.kind === "career" && cv === null) {
    return badRequest({ cv: ["required"] });
  }
  if (values.kind !== "career" && cv !== null) {
    return badRequest({ cv: ["not accepted for this kind"] });
  }

  const payload = payloadFor(values);
  const forwardedFor = clientKey(request);
  const userAgent = request.headers.get("user-agent") ?? "";

  // ---- 1. store it ----
  let stored;
  try {
    if (cv) {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        form.set(key, typeof value === "boolean" ? String(value) : String(value));
      }
      form.set("cv", cv, cv.name);
      stored = await storeInquiry(form, { forwardedFor, userAgent });
    } else {
      stored = await storeInquiry(payload, { forwardedFor, userAgent });
    }
  } catch (failure) {
    if (failure instanceof InquiryStoreError && failure.isRejection) {
      // The CMS refused the content itself — a bad field, or an idempotency
      // key reused for something different. Pass its verdict on rather than
      // reporting a server fault.
      return NextResponse.json(
        { ok: false, errors: failure.errors ?? {}, code: failure.code },
        { status: failure.status },
      );
    }
    // Storage is unavailable. The submission is NOT saved, so the visitor
    // must be told — this is the case that used to be hidden.
    console.error(
      "[inquiry] could not be stored:",
      failure instanceof Error ? failure.message : "unknown error",
    );
    return NextResponse.json(
      { ok: false, code: "store_unavailable" },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  // From here the submission exists. The request has succeeded whatever the
  // notification does next.

  // ---- 2. notify ----
  const notification: InquiryNotification = {
    id: stored.id,
    kind: values.kind,
    locale: typeof fields.locale === "string" ? fields.locale : "en",
    name: values.name,
    email: values.email,
    phone: values.phone,
    message: values.kind === "career" ? undefined : values.message,
    sendTo: values.kind === "contact" ? values.sendTo : undefined,
    companyName: values.kind === "vendor" ? values.companyName : undefined,
    city: values.kind === "vendor" ? values.city : undefined,
    serviceType: values.kind === "vendor" ? values.serviceType : undefined,
    isAramcoVendor: values.kind === "vendor" ? values.isAramcoVendor : undefined,
    aramcoVendorId:
      values.kind === "vendor" && values.isAramcoVendor ? values.aramcoVendorId : null,
    hasCv: values.kind === "career",
  };

  try {
    await sendInquiryEmail(notification);
    await reportNotification(stored.id, "");
  } catch (failure) {
    const reason = failure instanceof Error ? failure.message : "unknown error";
    // Logged as a reason only — the submission itself is personal data and
    // never reaches the logs.
    console.error("[inquiry] notification failed:", reason);
    await reportNotification(stored.id, reason);
  }

  return NextResponse.json({ ok: true, id: stored.id });
}
