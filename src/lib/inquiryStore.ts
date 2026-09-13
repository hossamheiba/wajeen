/**
 * The website's side of the inquiry record.
 *
 * Django is the system of record for submissions; this module is how the route
 * handler talks to it. Server-only — it carries the shared secret, so it must
 * never be imported into a client component.
 *
 * Every function here either succeeds or throws. That is the point: the route
 * handler needs to know whether the submission was stored, because a failure
 * has to reach the visitor as an error rather than being swallowed while they
 * are told "thank you". The old arrangement — email is the record, storage is
 * best-effort — is exactly what this replaces.
 */

import "server-only";

export interface StoredInquiry {
  id: number;
  created: boolean;
}

export class InquiryStoreError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Field errors from Django's serializer, when it rejected the payload. */
    readonly errors?: Record<string, string[]>,
    readonly code?: string,
  ) {
    super(message);
    this.name = "InquiryStoreError";
  }

  /** The visitor's fault: a field is wrong, and telling them which one helps. */
  get isRejection(): boolean {
    return this.status === 400 || this.status === 409;
  }
}

class NotConfiguredError extends Error {}

function endpoint(path: string): string {
  const base = process.env.NEXT_PUBLIC_CMS_API_URL;
  if (!base) {
    throw new NotConfiguredError("NEXT_PUBLIC_CMS_API_URL is not set");
  }
  return `${base.replace(/\/+$/, "")}/api/v1${path}`;
}

function token(): string {
  const secret = process.env.WJEEN_INQUIRY_TOKEN;
  if (!secret) {
    // A missing secret must fail loudly. Falling back to an unauthenticated
    // call would mean the endpoint had to accept anonymous writes, which is
    // the hole the secret exists to close.
    throw new NotConfiguredError("WJEEN_INQUIRY_TOKEN is not set");
  }
  return secret;
}

/** How long the CMS gets before the visitor is told to try again. */
const TIMEOUT_MS = 8_000;

async function readError(response: Response): Promise<InquiryStoreError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // A non-JSON error page is still an error; the status is what matters.
  }
  const shaped = (body ?? {}) as {
    detail?: string;
    errors?: Record<string, string[]>;
    code?: string;
  };
  return new InquiryStoreError(
    response.status,
    shaped.detail ?? `CMS answered ${response.status}`,
    shaped.errors,
    shaped.code,
  );
}

/**
 * Store one submission.
 *
 * `body` is either JSON (contact, vendor) or a FormData carrying the CV
 * (career). Both go to the same endpoint; Django decides what is valid.
 */
export async function storeInquiry(
  body: Record<string, unknown> | FormData,
  { forwardedFor, userAgent }: { forwardedFor: string; userAgent: string },
): Promise<StoredInquiry> {
  const isForm = body instanceof FormData;

  const response = await fetch(endpoint("/inquiries/"), {
    method: "POST",
    headers: {
      "X-Wjeen-Inquiry-Token": token(),
      "X-Forwarded-For": forwardedFor,
      "User-Agent": userAgent,
      Accept: "application/json",
      // FormData sets its own multipart boundary; only JSON is declared here.
      ...(isForm ? {} : { "Content-Type": "application/json" }),
    },
    body: isForm ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) throw await readError(response);
  return (await response.json()) as StoredInquiry;
}

/**
 * Report how the notification went.
 *
 * Called after the email attempt, whichever way it turned out. Never throws in
 * a way the visitor sees: by the time this runs the submission is already
 * stored, so the request has succeeded — a failure to record the *delivery*
 * outcome is a dashboard inaccuracy, not a lost enquiry.
 */
export async function reportNotification(
  id: number,
  error: string,
): Promise<void> {
  try {
    await fetch(endpoint(`/inquiries/${id}/notified/`), {
      method: "PATCH",
      headers: {
        "X-Wjeen-Inquiry-Token": token(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ error }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (failure) {
    // The reason only, never the submission: the row exists and the inbox
    // will simply show it as not yet notified, which is the safe default.
    console.error(
      "[inquiry] could not record the notification outcome:",
      failure instanceof Error ? failure.message : "unknown error",
    );
  }
}
