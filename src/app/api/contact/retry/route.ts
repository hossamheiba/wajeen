/**
 * Send the notifications that never went out.
 *
 * The split of responsibility is the reason this endpoint exists: Django holds
 * the submissions, but the mail provider's credentials live here, so Django
 * cannot send anything itself. It records `notified=false` with a reason, and
 * this handler is what drains that queue — driven by a scheduler, or by hand.
 *
 * A failed notification is never a lost submission. The row is already stored
 * and already visible in the inbox; this only catches up the email. That is
 * why it is safe for this to be a best-effort sweep rather than a transaction.
 *
 * Protected by the same shared secret the storage path uses: the caller is a
 * scheduler, not a person, so there is no session to authenticate.
 */

import { NextResponse } from "next/server";
import { sendInquiryEmail, type InquiryNotification } from "@/lib/mailer";
import { reportNotification } from "@/lib/inquiryStore";

interface PendingRow {
  id: number;
  kind: "contact" | "vendor" | "career";
  locale: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  send_to: string;
  company_name: string;
  city: string;
  service_type: string;
  is_aramco_vendor: boolean;
  aramco_vendor_id: string | null;
  cv: { id: number } | null;
}

function toNotification(row: PendingRow): InquiryNotification {
  return {
    id: row.id,
    kind: row.kind,
    locale: row.locale,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message || undefined,
    sendTo: row.send_to || undefined,
    companyName: row.company_name || undefined,
    city: row.city || undefined,
    serviceType: row.service_type || undefined,
    isAramcoVendor: row.kind === "vendor" ? row.is_aramco_vendor : undefined,
    aramcoVendorId: row.aramco_vendor_id,
    hasCv: row.cv !== null,
  };
}

export async function POST(request: Request) {
  const secret = process.env.WJEEN_INQUIRY_TOKEN;
  const sent = request.headers.get("x-wjeen-inquiry-token") ?? "";
  // A missing secret closes the endpoint rather than opening it.
  if (!secret || sent !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const base = process.env.NEXT_PUBLIC_CMS_API_URL;
  if (!base) {
    return NextResponse.json({ ok: false, code: "cms_not_configured" }, { status: 503 });
  }

  let pending: PendingRow[];
  try {
    const response = await fetch(
      `${base.replace(/\/+$/, "")}/api/v1/inquiries/pending-notification/`,
      {
        headers: { "X-Wjeen-Inquiry-Token": secret, Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error(`CMS answered ${response.status}`);
    pending = ((await response.json()) as { results: PendingRow[] }).results;
  } catch (failure) {
    console.error(
      "[inquiry] could not read the pending notifications:",
      failure instanceof Error ? failure.message : "unknown error",
    );
    return NextResponse.json({ ok: false, code: "cms_unreachable" }, { status: 503 });
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const row of pending) {
    try {
      await sendInquiryEmail(toNotification(row));
      await reportNotification(row.id, "");
      sentCount += 1;
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : "unknown error";
      // The reason only — the submission is personal data and stays out of
      // the logs. The attempt counter on the row is what eventually stops
      // this from retrying forever.
      console.error("[inquiry] retry failed:", reason);
      await reportNotification(row.id, reason);
      failedCount += 1;
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount, failed: failedCount });
}
