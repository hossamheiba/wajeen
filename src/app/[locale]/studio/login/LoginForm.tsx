"use client";

/**
 * The bootstrap the whole studio depends on.
 *
 *   GET  /admin/auth/csrf/   → token in the response body, cookie on the API
 *   POST /admin/auth/login/  → HttpOnly Secure SameSite=Strict cookies
 *
 * Both steps happen inside `login()`; this screen collects credentials and
 * decides where to go afterwards — through `safeNext`, because an unchecked
 * `?next=` would turn the sign-in page into a convincing phishing hop.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/studio/ui/Button";
import { ApiError, login } from "@/lib/studio/api";
import { USERNAME_KEY, write } from "@/lib/studio/preferences";
import { safeNext } from "@/lib/studio/redirect";
import { studioCopy, type Copy } from "@/lib/studio/i18n";

const CONTROL =
  "w-full rounded-ui border border-black/10 bg-white px-3.5 py-2.5 text-sm text-black " +
  "placeholder:text-gray-muted transition-colors focus:border-primary/50 focus:outline-none " +
  "focus:ring-2 focus:ring-primary/20";

/**
 * The throttled message says how long to wait but never why the attempt
 * failed — the API answers a throttled request identically whether or not the
 * username exists, and this must not undo that.
 */
function describeFailure(caught: unknown, copy: Copy): string {
  if (!(caught instanceof ApiError)) return copy.login.unreachable;
  if (caught.isThrottled) {
    return copy.login.throttled(
      caught.retryAfter ? Math.ceil(caught.retryAfter / 60) : null,
    );
  }
  if (caught.status === 401) return copy.login.rejected;
  return copy.login.unreachable;
}

function Form({ locale }: { locale: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeNext(params.get("next"), locale);
  const copy = studioCopy(locale);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await login(username, password);
      // Remembered only so the rail can greet someone by name; the session
      // itself lives in a cookie this code cannot read.
      write(USERNAME_KEY, session.username);
      router.replace(destination);
    } catch (caught) {
      setError(describeFailure(caught, copy));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-ui bg-primary text-lg font-black text-white shadow-[var(--shadow-badge)]">
            W
          </span>
          <h1 className="mt-4 text-xl font-black tracking-tight text-heading">
            {copy.login.title}
          </h1>
          <p className="mt-1 text-xs text-gray-muted">{copy.login.subtitle}</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-ui border border-black/[0.07] bg-white p-6 shadow-[var(--shadow-card)]"
        >
          <label className="mb-1.5 block text-xs font-bold text-heading" htmlFor="username">
            {copy.login.username}
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={CONTROL}
            required
          />

          <label
            className="mb-1.5 mt-4 block text-xs font-bold text-heading"
            htmlFor="password"
          >
            {copy.login.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={CONTROL}
            required
          />

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-ui bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? copy.login.submitting : copy.login.submit}
            </Button>
          </div>
        </form>
      </div>
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
