/**
 * The studio's client for the CMS API.
 *
 * Everything here assumes the API is a *different origin on the same site* —
 * `api.wjeen.com` beside `www.wjeen.com`. That is what lets the auth cookie
 * stay `SameSite=Strict` while still being sent, and it is why every request
 * carries `credentials: "include"`.
 *
 * The access token is never visible here: it lives in an HttpOnly cookie the
 * browser attaches by itself. The CSRF token is the opposite — it has to be
 * echoed in a header, and it comes from the bootstrap endpoint's *response
 * body*, not from `document.cookie`, so neither cookie needs a Domain
 * attribute and both stay host-only on the API.
 */

export const API_BASE = (
  process.env.NEXT_PUBLIC_CMS_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const ADMIN = `${API_BASE}/api/v1/admin`;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly body?: unknown,
  ) {
    super(detail);
    this.name = "ApiError";
  }

  /** A precondition failed: someone else moved the thing we were editing. */
  get isConflict(): boolean {
    return this.status === 412;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

const UNSAFE = new Set(["POST", "PATCH", "PUT", "DELETE"]);

let csrfToken: string | null = null;
/** One refresh at a time. Several 401s must not each start their own. */
let refreshInFlight: Promise<boolean> | null = null;

async function bootstrapCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${ADMIN}/auth/csrf/`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new ApiError(response.status, "Could not start a session.");
  const body = (await response.json()) as { csrfToken?: string };
  csrfToken = body.csrfToken ?? null;
  if (!csrfToken) throw new ApiError(500, "The CSRF bootstrap returned no token.");
  return csrfToken;
}

/** Drops the cached token so the next mutation fetches a fresh one. */
export function forgetCsrf(): void {
  csrfToken = null;
}

async function send(
  path: string,
  init: RequestInit & { method?: string },
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  if (UNSAFE.has(method)) headers.set("X-CSRFToken", await bootstrapCsrf());

  return fetch(`${ADMIN}${path}`, { ...init, method, headers, credentials: "include" });
}

async function refresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await send("/auth/refresh/", { method: "POST", body: "{}" });
        return response.ok;
      } catch {
        return false;
      } finally {
        // Cleared here rather than in the caller so a rejected promise cannot
        // be handed to the next waiter forever.
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function parse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function detailOf(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    return String((body as { detail: unknown }).detail);
  }
  if (typeof body === "string" && body) return body;
  return fallback;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Block version for PATCH/DELETE, or revision number for publish/rollback. */
  ifMatch?: number;
  /** Internal: prevents a refreshed request from refreshing again. */
  retried?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, ifMatch, retried = false } = options;

  const headers: Record<string, string> = {};
  if (ifMatch !== undefined) headers["If-Match"] = String(ifMatch);

  const response = await send(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && !retried && !path.startsWith("/auth/")) {
    // Exactly one attempt: if the refresh itself is unauthenticated, the
    // session is gone and retrying again would just loop.
    if (await refresh()) {
      return apiRequest<T>(path, { ...options, retried: true });
    }
  }

  const parsed = await parse(response);
  if (!response.ok) {
    throw new ApiError(response.status, detailOf(parsed, response.statusText), parsed);
  }
  return parsed as T;
}

// ---------------------------------------------------------------- auth

export async function login(username: string, password: string): Promise<{ username: string }> {
  // A fresh token per attempt: the previous one may belong to a dead session.
  forgetCsrf();
  return apiRequest("/auth/login/", { method: "POST", body: { username, password } });
}

export async function logout(): Promise<void> {
  await apiRequest("/auth/logout/", { method: "POST", body: {} });
  forgetCsrf();
}

// ---------------------------------------------------------------- content

export interface BlockSummary {
  namespace: string;
  locale: string;
  version: number;
  has_draft: boolean;
  updated_at: string;
}

export interface BlockList {
  blocks: BlockSummary[];
  pendingDrafts: number;
  currentRevision: number | null;
}

export interface BlockDetail {
  namespace: string;
  locale: string;
  version: number;
  hasDraft: boolean;
  published: Record<string, unknown>;
  draft: Record<string, unknown> | null;
  effective: Record<string, unknown>;
}

export const listBlocks = () => apiRequest<BlockList>("/content/");

export const readBlock = (root: string, locale: string) =>
  apiRequest<BlockDetail>(`/content/${root}/${locale}/`);

export const patchBlock = (
  root: string,
  locale: string,
  path: string,
  patch: Record<string, unknown>,
  version: number,
) =>
  apiRequest<{ version: number; hasDraft: boolean; draft: Record<string, unknown> }>(
    `/content/${root}/${locale}/`,
    { method: "PATCH", body: { path, patch }, ifMatch: version },
  );

export const discardDraft = (root: string, locale: string, version: number) =>
  apiRequest<{ namespace: string; version: number }>(`/content/${root}/${locale}/`, {
    method: "DELETE",
    ifMatch: version,
  });

/** The whole locale as an editor sees it: drafts where they exist. */
export const readDraftMessages = (locale: string) =>
  apiRequest<Record<string, unknown>>(`/preview/${locale}/`);

// ---------------------------------------------------------------- versions

export interface VersionSummary {
  number: number;
  label: string;
  source: "publish" | "rollback";
  is_current: boolean;
  rolled_back_from: number | null;
  created_at: string;
}

export interface VersionDetail {
  number: number;
  label: string;
  source: "publish" | "rollback";
  isCurrent: boolean;
  rolledBackFrom: number | null;
  createdAt: string;
  createdBy: string | null;
  snapshot: Record<string, Record<string, unknown>>;
}

export const listVersions = () =>
  apiRequest<{ versions: VersionSummary[] }>("/versions/");

export const readVersion = (number: number) =>
  apiRequest<VersionDetail>(`/versions/${number}/`);

export const publish = (label: string, ifMatch: number | null) =>
  apiRequest<{ number: number; source: string; label: string }>("/publish/", {
    method: "POST",
    body: { label },
    ...(ifMatch === null ? {} : { ifMatch }),
  });

export const rollback = (target: number, label: string, ifMatch: number | null) =>
  apiRequest<{ number: number; source: string; rolledBackFrom: number }>(
    `/versions/${target}/rollback/`,
    { method: "POST", body: { label }, ...(ifMatch === null ? {} : { ifMatch }) },
  );
