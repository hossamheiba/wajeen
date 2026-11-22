"use client";

/**
 * "My account": who is signed in, and a way to change their own password.
 *
 *   POST /admin/account/password/   { current_password, new_password }
 *
 * The API asks for the current password again and counts wrong guesses, so
 * what this screen owes the editor is plain answers: a typo in the current
 * password says so (and does not sign anyone out), a weak new one says why,
 * and a success says it worked — then empties the fields, so nothing typed
 * lingers on the screen.
 */

import { useState } from "react";
import { Button } from "@/components/studio/ui/Button";
import { SectionLabel, Surface } from "@/components/studio/ui/Surface";
import { ApiError, changePassword } from "@/lib/studio/api";
import { studioCopy, type Copy } from "@/lib/studio/i18n";
import { usePageMeta, useStudio } from "../StudioShell";

const CONTROL =
  "w-full rounded-ui border border-black/10 bg-white px-3.5 py-2.5 text-sm text-black " +
  "placeholder:text-gray-muted transition-colors focus:border-primary/50 focus:outline-none " +
  "focus:ring-2 focus:ring-primary/20";

const MIN_LENGTH = 8;

/** One sentence for whatever the API said, in the editor's language. */
function describeFailure(caught: unknown, copy: Copy["account"]): string {
  if (!(caught instanceof ApiError)) return copy.unreachable;
  if (caught.isThrottled) {
    return copy.throttled(caught.retryAfter ? Math.ceil(caught.retryAfter / 60) : null);
  }
  const body = (caught.body ?? {}) as { code?: string; codes?: string[] };
  switch (body.code) {
    case "wrong_current":
      return copy.wrongCurrent;
    case "same_password":
      return copy.same;
    case "weak_password": {
      const codes = body.codes ?? [];
      if (codes.includes("password_too_short")) return copy.tooShort;
      if (codes.includes("password_too_common")) return copy.tooCommon;
      if (codes.includes("password_entirely_numeric")) return copy.numeric;
      if (codes.includes("password_too_similar")) return copy.similar;
      return copy.weak;
    }
    default:
      return copy.unreachable;
  }
}

export function AccountPage({ locale }: { locale: string }) {
  const { username } = useStudio();
  const copy = studioCopy(locale);
  const text = copy.account;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  usePageMeta({ title: text.title, subtitle: text.subtitle }, [locale]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    if (next !== confirm) {
      setError(text.mismatch);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
    } catch (caught) {
      setError(describeFailure(caught, text));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Surface className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-black uppercase text-white">
          {(username ?? "?").slice(0, 2)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-xs text-gray-muted">{text.signedInAs}</p>
          <p className="truncate text-base font-bold text-heading" dir="ltr">
            {username ?? copy.nav.signedIn}
          </p>
          <p className="mt-0.5 text-xs text-gray-muted">{copy.nav.role}</p>
        </div>
      </Surface>

      <Surface>
        <SectionLabel>{text.passwordTitle}</SectionLabel>
        <p className="mt-2 text-xs leading-6 text-gray-muted">{text.passwordHint}</p>

        <form onSubmit={submit} className="mt-5">
          <label className="mb-1.5 block text-xs font-bold text-heading" htmlFor="current-password">
            {text.current}
          </label>
          <input
            id="current-password"
            name="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className={CONTROL}
            required
          />

          <label className="mb-1.5 mt-4 block text-xs font-bold text-heading" htmlFor="new-password">
            {text.next}
          </label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            className={CONTROL}
            required
          />

          <label className="mb-1.5 mt-4 block text-xs font-bold text-heading" htmlFor="confirm-password">
            {text.confirm}
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={CONTROL}
            required
          />

          {error ? (
            <p role="alert" className="mt-4 rounded-ui bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="mt-4 rounded-ui bg-green-50 px-3 py-2.5 text-xs font-medium text-green-800">
              {text.saved}
            </p>
          ) : null}

          <div className="mt-6">
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? text.submitting : text.submit}
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
