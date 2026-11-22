"use client";

/**
 * "Message recipients": the mailbox each "send the message to" choice on the
 * contact form is delivered to.
 *
 *   GET|PUT /admin/inquiries/recipients/   { recipients: [{ code, email }] }
 *
 * Which choices exist, and what they are called, is the contact form's own
 * content (`contactPage.form.sendToOptions`) — an editor adds or renames one
 * there. This screen reads those names, as the editor currently sees them, and
 * shows only the ones the form offers; the addresses themselves are private
 * and live in a table of their own, never in the public content.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/studio/ui/Button";
import { SectionLabel, Surface } from "@/components/studio/ui/Surface";
import {
  ApiError,
  listRecipients,
  readDraftMessages,
  saveRecipients,
  type RecipientAddress,
} from "@/lib/studio/api";
import { studioCopy } from "@/lib/studio/i18n";
import { recipientGroups } from "@/lib/inquiryVocab";
import { usePageMeta } from "../StudioShell";

const CONTROL =
  "w-full rounded-ui border border-black/10 bg-white px-3.5 py-2.5 text-sm text-black " +
  "placeholder:text-gray-muted transition-colors focus:border-primary/50 focus:outline-none " +
  "focus:ring-2 focus:ring-primary/20";

/** The same shape check the server applies; the server is still the judge. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Role {
  code: string;
  label: string;
}

export function RecipientsPage({ locale }: { locale: string }) {
  const copy = studioCopy(locale);
  const text = copy.recipients;

  const [roles, setRoles] = useState<Role[] | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  usePageMeta({ title: text.title, subtitle: text.subtitle }, [locale]);

  const load = useCallback(async () => {
    try {
      const [addresses, tree] = await Promise.all([listRecipients(), readDraftMessages(locale)]);
      const form = ((tree.contactPage ?? {}) as { form?: Record<string, unknown> }).form ?? {};
      const groups = recipientGroups(form.sendToOptions, form.sendToGroups, "");
      // The names the form shows, in the order it shows them. A role whose name
      // was cleared is off the form and off this screen.
      const shown = groups.flatMap((group) =>
        group.options.filter((option) => option.label !== ""),
      );
      const current = Object.fromEntries(addresses.recipients.map((row) => [row.code, row.email]));
      setRoles(shown.map((option) => ({ code: option.code, label: option.label })));
      setSaved(current);
      setDraft(current);
    } catch (caught) {
      setBanner({
        tone: "error",
        message: caught instanceof ApiError ? caught.detail : text.loadFailed,
      });
      setRoles([]);
    }
  }, [locale, text.loadFailed]);

  useEffect(() => {
    // Loads once on arrival; every setState runs after a network round trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const dirty = useMemo(
    () => (roles ?? []).some((role) => (draft[role.code] ?? "") !== (saved[role.code] ?? "")),
    [roles, draft, saved],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBanner(null);

    const problems: Record<string, string> = {};
    for (const role of roles ?? []) {
      const value = (draft[role.code] ?? "").trim();
      if (value !== "" && !LOOKS_LIKE_EMAIL.test(value)) problems[role.code] = text.invalid;
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setBusy(true);
    try {
      const rows: RecipientAddress[] = (roles ?? []).map((role) => ({
        code: role.code,
        email: (draft[role.code] ?? "").trim(),
      }));
      const answer = await saveRecipients(rows);
      const current = Object.fromEntries(answer.recipients.map((row) => [row.code, row.email]));
      setSaved(current);
      setDraft(current);
      setBanner({ tone: "ok", message: text.saved });
    } catch (caught) {
      // Django names the row that failed by its place in what was sent.
      const body = (caught instanceof ApiError ? caught.body : null) as {
        errors?: { recipients?: ({ email?: string[] } | null)[] };
      } | null;
      const rejected = body?.errors?.recipients;
      if (Array.isArray(rejected)) {
        const next: Record<string, string> = {};
        rejected.forEach((entry, index) => {
          const role = (roles ?? [])[index];
          if (role && entry?.email?.length) next[role.code] = text.invalid;
        });
        setErrors(next);
      }
      setBanner({
        tone: "error",
        message: caught instanceof ApiError && !caught.isThrottled ? text.saveFailed : text.unreachable,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Surface>
        <SectionLabel>{text.title}</SectionLabel>
        <p className="mt-2 text-xs leading-6 text-gray-muted">{text.intro}</p>

        {roles === null ? (
          <p className="mt-6 text-xs text-gray-muted" aria-busy="true">
            …
          </p>
        ) : roles.length === 0 ? (
          <p className="mt-6 text-xs leading-6 text-gray-muted">{text.empty}</p>
        ) : (
          <form onSubmit={submit} className="mt-6" noValidate>
            <ul className="m-0 flex list-none flex-col gap-5 p-0">
              {roles.map((role) => {
                const id = `recipient-${role.code}`;
                const error = errors[role.code];
                return (
                  <li key={role.code}>
                    <label className="mb-1.5 block text-xs font-bold text-heading" htmlFor={id}>
                      {role.label}
                    </label>
                    <input
                      id={id}
                      name={id}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      dir="ltr"
                      value={draft[role.code] ?? ""}
                      placeholder={text.placeholder}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, [role.code]: event.target.value }));
                        setErrors((current) => ({ ...current, [role.code]: "" }));
                        setBanner(null);
                      }}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${id}-error` : `${id}-hint`}
                      className={`${CONTROL} text-start`}
                    />
                    {error ? (
                      <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-700">
                        {error}
                      </p>
                    ) : (draft[role.code] ?? "").trim() === "" ? (
                      <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-gray-muted">
                        → {text.general}
                      </p>
                    ) : (
                      <span id={`${id}-hint`} />
                    )}
                  </li>
                );
              })}
            </ul>

            {banner ? (
              <p
                role={banner.tone === "error" ? "alert" : "status"}
                className={`mt-6 rounded-ui px-3 py-2.5 text-xs font-medium ${
                  banner.tone === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
                }`}
              >
                {banner.message}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button type="submit" disabled={busy || !dirty} className="w-full sm:w-auto">
                {busy ? text.saving : text.save}
              </Button>
              {dirty && !busy ? (
                <span className="text-[11px] text-gray-muted">{text.unsaved}</span>
              ) : null}
            </div>
          </form>
        )}
      </Surface>

      {roles !== null && roles.length > 0 ? (
        <p className="px-1 text-[11px] leading-5 text-gray-muted">{text.manage}</p>
      ) : null}
    </div>
  );
}
