"use client";

/**
 * The bootstrap the whole studio depends on.
 *
 *   GET  /admin/auth/csrf/   → token in the response body, cookie on the API host
 *   POST /admin/auth/login/  → HttpOnly Secure SameSite=Strict cookies
 *
 * Both steps happen inside `login()`; this screen only collects credentials
 * and decides where to go afterwards — via `safeNext`, because an unchecked
 * `?next=` would make this page an open redirect and a convincing phishing hop.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, login } from "@/lib/studio/api";
import { safeNext } from "@/lib/studio/redirect";

/**
 * The throttled message says how long to wait but never why the attempt
 * failed — the API answers a throttled request identically whether or not the
 * username exists, and this must not undo that.
 */
function describeFailure(caught: unknown): string {
  if (!(caught instanceof ApiError)) return "Could not reach the content service.";
  if (caught.isThrottled) {
    const minutes = caught.retryAfter ? Math.ceil(caught.retryAfter / 60) : null;
    return minutes
      ? `Too many sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
      : "Too many sign-in attempts. Try again later.";
  }
  if (caught.status === 401) return "Those credentials were not accepted.";
  return "Could not reach the content service.";
}

function Form({ locale }: { locale: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeNext(params.get("next"), locale);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      router.replace(destination);
    } catch (caught) {
      setError(describeFailure(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6" dir="ltr">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6"
      >
        <h1 className="text-lg font-semibold tracking-tight">Wjeen Studio</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to edit site content.</p>

        <label className="mt-6 block text-sm font-medium" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          required
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          required
        />

        {error ? (
          <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export function LoginForm({ locale }: { locale: string }) {
  // useSearchParams needs a suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <Form locale={locale} />
    </Suspense>
  );
}
