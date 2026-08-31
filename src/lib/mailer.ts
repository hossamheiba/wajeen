import { Resend } from "resend";
import type { ContactFormValues } from "@/lib/contactSchema";

/**
 * Delivery for contact-form submissions.
 *
 * The only export is `sendContactEmail`. The route handler calls it and cares
 * about one thing: did it throw. Everything provider-specific — the client,
 * the envelope, Resend's error shape — stays behind that line, so swapping
 * providers later touches this file and nothing else.
 */

/** What the email needs; the honeypot field is not part of it. */
export type ContactSubmission = Omit<ContactFormValues, "company">;

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

const SECTOR_LABELS: Record<ContactSubmission["sector"], string> = {
  infrastructure: "Infrastructure",
  energy: "Energy",
  buildings: "Building Construction",
  other: "Other",
};

function buildHtml(data: ContactSubmission) {
  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:8px 16px 8px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
       <td style="padding:8px 0;color:#111827;font-size:14px">${escapeHtml(value)}</td>
     </tr>`;

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8fc;padding:32px">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid rgba(17,24,39,.08)">
    <div style="background:#0f155f;padding:20px 28px">
      <div style="color:#ffffff;font-size:16px;font-weight:700">New contact enquiry</div>
      <div style="color:rgba(255,255,255,.7);font-size:13px;margin-top:4px">wjeen.com contact form</div>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse">
        ${row("Name", data.name)}
        ${row("Email", data.email)}
        ${data.phone ? row("Phone", data.phone) : ""}
        ${row("Sector", SECTOR_LABELS[data.sector])}
      </table>
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(17,24,39,.08)">
        <div style="color:#6b7280;font-size:13px;margin-bottom:8px">Message</div>
        <div style="color:#111827;font-size:14px;line-height:1.65;white-space:pre-wrap">${escapeHtml(data.message)}</div>
      </div>
    </div>
  </div>
</div>`;
}

function buildText(data: ContactSubmission) {
  return [
    "New contact enquiry — wjeen.com",
    "",
    `Name:    ${data.name}`,
    `Email:   ${data.email}`,
    ...(data.phone ? [`Phone:   ${data.phone}`] : []),
    `Sector:  ${SECTOR_LABELS[data.sector]}`,
    "",
    "Message:",
    data.message,
  ].join("\n");
}

/**
 * Sends one submission. Resolves on success; throws on any failure so the
 * caller can answer 500. Nothing here logs the submission itself — name,
 * email, phone and message are personal data and must stay out of the logs.
 */
export async function sendContactEmail(data: ContactSubmission): Promise<void> {
  const to = process.env.MAIL_TO;
  const from = process.env.MAIL_FROM;
  if (!to || !from) {
    throw new MailNotConfiguredError("MAIL_TO / MAIL_FROM are not set");
  }

  const resend = getClient();

  // Resend reports API failures in the result rather than by throwing, so the
  // error has to be checked explicitly — an unchecked call would look like a
  // success and the enquiry would vanish silently.
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `New contact enquiry — ${data.name}`,
    replyTo: data.email,
    html: buildHtml(data),
    text: buildText(data),
  });

  if (error) {
    // Provider message only: it describes the delivery failure, not the
    // submission, and it never leaves the server (the route returns a bare
    // `{ ok: false }`).
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
