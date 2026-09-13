/**
 * The studio's view of the inbox.
 *
 * A thin typed layer over the same authenticated client the content editor and
 * the media library use — same cookie, same CSRF token, same
 * refresh-once-and-retry — so there is one session and one error shape across
 * the whole dashboard.
 *
 * Note what is absent: there is no `deleteInquiry`. A message is archived, and
 * a record of who contacted the company is not something a dashboard should be
 * able to erase. The API has no DELETE either.
 *
 * A CV is not represented as a URL anywhere in this file. The only route to
 * one is `cvDownloadUrl`, which points at an authenticated endpoint that
 * checks a separate permission and writes an access log.
 */

import { API_BASE, apiRequest } from "./api";

export type InquiryKind = "contact" | "vendor" | "career";
export type InquiryStatus = "new" | "read" | "replied" | "archived";

export interface InquiryCv {
  id: number;
  original_name: string;
  content_type: string;
  bytes: number;
  created_at: string;
  expires_at: string;
  purged_at: string | null;
  available: boolean;
}

export interface Inquiry {
  id: number;
  kind: InquiryKind;
  kind_label: string;
  status: InquiryStatus;
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
  cv: InquiryCv | null;
  notified: boolean;
  notify_attempts: number;
  notify_error: string;
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
  handled_by: string | null;
}

export interface InquiryCounts {
  new: number;
  contact: number;
  vendor: number;
  career: number;
  /** Submissions whose notification email never went out. */
  unnotified: number;
}

export interface InquiryPage {
  results: Inquiry[];
  total: number;
  page: number;
  pageSize: number;
  counts: InquiryCounts;
}

export interface InquiryQuery {
  kind?: InquiryKind | "";
  status?: InquiryStatus | "";
  search?: string;
  notified?: "false";
  page?: number;
}

export function listInquiries(query: InquiryQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== null) {
      params.set(key, String(value));
    }
  }
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<InquiryPage>(`/inquiries/${suffix}`);
}

export function readInquiry(id: number) {
  return apiRequest<Inquiry>(`/inquiries/${id}/`);
}

/**
 * Move an inquiry's status.
 *
 * The timestamps are the server's business: reaching `read` stamps `read_at`
 * the first time and never again, and the same for `replied`. Nothing here
 * sends a date.
 */
export function setInquiryStatus(id: number, status: InquiryStatus) {
  return apiRequest<Inquiry>(`/inquiries/${id}/`, {
    method: "PATCH",
    body: { status },
  });
}

/** Clear the notification flags so the site's retry picks this row up again. */
export function requeueNotification(id: number) {
  return apiRequest<{ queued: boolean }>(`/inquiries/${id}/notify/`, {
    method: "POST",
    body: {},
  });
}

/**
 * The authenticated download route for a CV.
 *
 * A plain link, opened in a new tab, so the browser's own download handling
 * applies and the cookie rides along. There is no public URL to fall back on:
 * the storage class behind it refuses to produce one.
 */
export function cvDownloadUrl(id: number): string {
  return `${API_BASE}/api/v1/admin/inquiries/${id}/cv/`;
}
