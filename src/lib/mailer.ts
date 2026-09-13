import { Resend } from "resend";

/**
 * Notification for submissions that arrived through the website.
 *
 * The only export is `sendInquiryEmail`. The route handler calls it and cares
 * about one thing: did it throw. Everything provider-specific — the client,
 * the envelope, Resend's error shape — stays behind that line, so swapping
 * providers later touches this file and nothing else.
 *
 * Its role changed with the inquiry work: the email used to *be* the record,
 * and is now a notification about a record that already exists in the CMS. So
 * a failure here no longer loses anything — it is reported back to Django,
 * shown in the inbox as "not emailed", and retried. That is why this file can
 * stay this simple.
 *
 * A CV is never attached. It is personal data belonging to an applicant, and
 * copying it into a mailbox would put it somewhere with no access control and
 * no retention. The email links to the inbox instead.
 */

/** The fields a notification is built from — the row as Django stored it. */
export interface InquiryNotification {
  id: number;
  kind: "contact" | "vendor" | "career";
  locale: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  sendTo?: string;
  companyName?: string;
  city?: string;
  serviceType?: string;
  isAramcoVendor?: boolean;
  aramcoVendorId?: string | null;
  hasCv?: boolean;
}

class MailNotConfiguredError extends Error {}

/**
 * Built per call rather than at module scope: reading env at import time would
 * make a missing key a build-time crash, and `next build` prerenders without
 * the production environment loaded.
 */
function getClient() {
  const apiKey = process.env.MAIL_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new MailNotConfiguredError("MAIL_PROVIDER_API_KEY is not set");
  }
  return new Resend(apiKey);
}

/** Values come from a public form, so they are escaped before going into HTML. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const KIND_TITLES: Record<InquiryNotification["kind"], string> = {
  contact: "New contact enquiry",
  vendor: "New service-provider enquiry",
  career: "New job application",
};

/**
 * Codes are turned into words here, not looked up in the CMS.
 *
 * The site's labels live in `src/messages/*.json` so an editor can reword
 * them; an email is not a page and must not depend on which locale's content
 * happens to be loaded. These are plain English for whoever reads the inbox.
 */
function humanise(code: string) {
  return code
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** The rows each kind shows, in the order a reader wants them. */
function rowsFor(data: InquiryNotification): [string, string][] {
  const rows: [string, string][] = [];

  if (data.kind === "contact") {
    // First, because it is the reason the field exists: who this is for.
    rows.push(["For", humanise(data.sendTo ?? "")]);
  }
  if (data.kind === "vendor") {
    rows.push(["Company", data.companyName ?? ""]);
  }

  rows.push(["Name", data.name], ["Email", data.email], ["Phone", data.phone]);

  if (data.kind === "vendor") {
    rows.push(
      ["City", humanise(data.city ?? "")],
      ["Service", humanise(data.serviceType ?? "")],
      [
        "Aramco vendor",
        data.isAramcoVendor ? `Yes — ${data.aramcoVendorId ?? ""}` : "No",
      ],
    );
  }
  if (data.kind === "career") {
    rows.push(["CV", data.hasCv ? "Attached — open it in the inbox" : "Missing"]);
  }

  return rows;
}

function inboxUrl(id: number) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  return `${site}/en/studio/inbox?id=${id}`;
}

function buildHtml(data: InquiryNotification) {
  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:8px 16px 8px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
       <td style="padding:8px 0;color:#111827;font-size:14px">${escapeHtml(value)}</td>
     </tr>`;

  const body = data.message
    ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(17,24,39,.08)">
        <div style="color:#6b7280;font-size:13px;margin-bottom:8px">Message</div>
        <div style="color:#111827;font-size:14px;line-height:1.65;white-space:pre-wrap">${escapeHtml(data.message)}</div>
      </div>`
    : "";

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8fc;padding:32px">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid rgba(17,24,39,.08)">
    <div style="background:#0f155f;padding:20px 28px">
      <div style="color:#ffffff;font-size:16px;font-weight:700">${KIND_TITLES[data.kind]}</div>
      <div style="color:rgba(255,255,255,.7);font-size:13px;margin-top:4px">wjeen.com · reference #${data.id}</div>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse">
        ${rowsFor(data).map(([label, value]) => row(label, value)).join("")}
      </table>
      ${body}
      <div style="margin-top:24px">
        <a href="${inboxUrl(data.id)}" style="display:inline-block;background:#0f155f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px">Open in the inbox</a>
      </div>
    </div>
  </div>
</div>`;
}

function buildText(data: InquiryNotification) {
  return [
    `${KIND_TITLES[data.kind]} — wjeen.com (reference #${data.id})`,
    "",
    ...rowsFor(data).map(([label, value]) => `${label.padEnd(15)}${value}`),
    ...(data.message ? ["", "Message:", data.message] : []),
    "",
    `Open in the inbox: ${inboxUrl(data.id)}`,
  ].join("\n");
}

/**
 * Sends one notification. Resolves on success; throws on any failure so the
 * caller can report it back to Django. Nothing here logs the submission
 * itself — name, email, phone and message are personal data and must stay out
 * of the logs.
 */
export async function sendInquiryEmail(data: InquiryNotification): Promise<void> {
  const to = process.env.MAIL_TO;
  const from = process.env.MAIL_FROM;
  if (!to || !from) {
    throw new MailNotConfiguredError("MAIL_TO / MAIL_FROM are not set");
  }

  const resend = getClient();

  // Resend reports API failures in the result rather than by throwing, so the
  // error has to be checked explicitly — an unchecked call would look like a
  // success and the notification would never be retried.
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${KIND_TITLES[data.kind]} — ${data.name}`,
    replyTo: data.email,
    html: buildHtml(data),
    text: buildText(data),
  });

  if (error) {
    // Provider message only: it describes the delivery failure, not the
    // submission, and it is stored on the inquiry as `notify_error`.
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
