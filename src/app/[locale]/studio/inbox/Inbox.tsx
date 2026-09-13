"use client";

/**
 * Everything the website's forms have sent.
 *
 * One screen for all three kinds, because they differ by a handful of fields
 * and three screens would have been three of everything for the same work.
 * The tabs filter; the detail panel shows whichever fields the kind actually
 * has.
 *
 * Two things this screen exists to make visible:
 *
 *   - **A submission that was stored but never emailed.** The route handler
 *     stores first and notifies second, so a delivery failure is a state on
 *     the row rather than a swallowed log line. It is drawn as a badge here,
 *     with a button to queue it again — which is the whole reason the
 *     dashboard can be called the reliable record.
 *   - **A CV, and who opened it.** The download is an authenticated request
 *     that checks a separate permission and writes an access log. There is no
 *     URL to copy and nothing to leak; when the button is absent it is
 *     because the API would refuse anyway.
 *
 * There is no delete. A message is archived.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, StatusPill } from "@/components/studio/ui/Badge";
import { Button } from "@/components/studio/ui/Button";
import { SearchInput } from "@/components/studio/ui/SearchInput";
import { Surface } from "@/components/studio/ui/Surface";
import { useToast } from "@/components/studio/ui/Toast";
import { IconInbox, IconWarning } from "@/components/studio/icons";
import { MediaDialog } from "@/components/studio/media/MediaDialog";
import { ApiError } from "@/lib/studio/api";
import {
  cvDownloadUrl,
  listInquiries,
  readInquiry,
  requeueNotification,
  setInquiryStatus,
  type Inquiry,
  type InquiryCounts,
  type InquiryKind,
  type InquiryStatus,
} from "@/lib/studio/inquiries";
import { studioCopy } from "@/lib/studio/i18n";
import { timeAgo } from "@/lib/studio/ui";
import { usePageMeta } from "../StudioShell";

const TABS: (InquiryKind | "")[] = ["", "contact", "vendor", "career"];
const STATUSES: InquiryStatus[] = ["new", "read", "replied", "archived"];

const TONE: Record<InquiryStatus, "draft" | "live" | "neutral" | "warning"> = {
  new: "draft",
  read: "neutral",
  replied: "live",
  archived: "neutral",
};

export function Inbox({ locale }: { locale: string }) {
  const copy = studioCopy(locale);
  const toast = useToast();

  const [page, setPage] = useState<{
    results: Inquiry[];
    total: number;
    counts: InquiryCounts;
  } | null>(null);
  const [kind, setKind] = useState<InquiryKind | "">("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);

  const load = useCallback(async () => {
    try {
      const answer = await listInquiries({
        kind: kind || undefined,
        status: status || undefined,
        search: search.trim() || undefined,
      });
      setPage({ results: answer.results, total: answer.total, counts: answer.counts });
    } catch (failure) {
      setPage({
        results: [],
        total: 0,
        counts: { new: 0, contact: 0, vendor: 0, career: 0, unnotified: 0 },
      });
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    }
  }, [kind, status, search, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  usePageMeta(
    {
      title: copy.inbox.title,
      subtitle: copy.inbox.subtitle,
    },
    [locale],
  );

  const counts = page?.counts;
  const tabCount = useMemo(
    () => ({
      "": counts?.new ?? 0,
      contact: counts?.contact ?? 0,
      vendor: counts?.vendor ?? 0,
      career: counts?.career ?? 0,
    }),
    [counts],
  );

  const open = async (row: Inquiry) => {
    setSelected(row);
    // Opening a message is what "read" means, so it is recorded here rather
    // than behind a button nobody would press.
    if (row.status === "new") {
      try {
        const updated = await setInquiryStatus(row.id, "read");
        setSelected(updated);
        await load();
      } catch {
        // Not worth interrupting a person who just wanted to read something.
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Surface className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((option) => {
            const active = kind === option;
            const label =
              option === ""
                ? copy.inbox.tabs.all
                : copy.inbox.tabs[option as "contact" | "vendor" | "career"];
            const badge = tabCount[option as keyof typeof tabCount];
            return (
              <button
                key={option || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKind(option)}
                className={`flex h-9 items-center gap-2 rounded-ui px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 ${
                  active
                    ? "bg-primary text-white"
                    : "bg-white text-gray-muted border border-black/10 hover:text-heading"
                }`}
              >
                {label}
                {badge > 0 ? (
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      active ? "bg-white/20" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="lg:w-80">
            <SearchInput
              value={search}
              onChange={setSearch}
              label={copy.inbox.searchLabel}
              placeholder={copy.inbox.searchLabel}
            />
          </div>

          <label className="flex items-center gap-1.5">
            <span className="sr-only">{copy.inbox.statusLabel}</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as InquiryStatus | "")}
              className="h-9 rounded-ui border border-black/10 bg-white px-2.5 text-xs font-semibold text-heading focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <option value="">{copy.inbox.filterStatus}</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {copy.inbox.status[option]}
                </option>
              ))}
            </select>
          </label>

          {counts && counts.unnotified > 0 ? (
            <button
              type="button"
              onClick={() => setStatus("")}
              className="flex items-center gap-1.5 rounded-ui bg-amber-500/[0.12] px-3 py-1.5 text-[11px] font-bold text-amber-900 lg:ms-auto"
            >
              <IconWarning width={13} height={13} />
              {copy.inbox.notNotified}: {counts.unnotified}
            </button>
          ) : (
            <span className="text-[11px] text-gray-muted lg:ms-auto">
              {page ? copy.inbox.total(page.total) : ""}
            </span>
          )}
        </div>
      </Surface>

      {page === null ? (
        <Surface padded={false} className="overflow-hidden">
          <ul className="divide-y divide-black/[0.06]">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index} className="px-4 py-3">
                <div className="studio-skeleton h-4 w-1/3 rounded bg-black/[0.06]" />
              </li>
            ))}
          </ul>
        </Surface>
      ) : page.results.length === 0 ? (
        <Surface className="flex flex-col items-center gap-2 py-14 text-center">
          <IconInbox width={26} height={26} className="text-gray-muted" />
          <h2 className="t-small font-bold text-heading">{copy.inbox.empty}</h2>
          <p className="text-xs text-gray-muted">{copy.inbox.emptyBody}</p>
        </Surface>
      ) : (
        <Surface padded={false} className="overflow-hidden">
          <ul className="divide-y divide-black/[0.06]">
            {page.results.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void open(row)}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-start transition-colors hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
                >
                  <Badge tone="neutral">{copy.inbox.tabs[row.kind]}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-heading">
                    {row.kind === "vendor" && row.company_name
                      ? `${row.company_name} — ${row.name}`
                      : row.name}
                  </span>
                  <span className="hidden min-w-0 truncate text-[11px] text-gray-muted sm:block sm:w-52">
                    {row.email}
                  </span>
                  {!row.notified ? (
                    <Badge tone="warning">{copy.inbox.notNotified}</Badge>
                  ) : null}
                  <StatusPill tone={TONE[row.status]}>
                    {copy.inbox.status[row.status]}
                  </StatusPill>
                  <span className="w-20 shrink-0 text-end text-[11px] text-gray-muted">
                    {timeAgo(row.created_at, locale)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <InquiryDetail
        inquiry={selected}
        onClose={() => setSelected(null)}
        onChanged={load}
        copy={copy}
        locale={locale}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-muted">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-heading">{value}</dd>
    </div>
  );
}

function InquiryDetail({
  inquiry,
  onClose,
  onChanged,
  copy,
  locale,
}: {
  inquiry: Inquiry | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  copy: ReturnType<typeof studioCopy>;
  locale: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [row, setRow] = useState<Inquiry | null>(inquiry);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRow(inquiry);
  }, [inquiry]);

  if (!row) return null;

  const move = async (status: InquiryStatus) => {
    setBusy(true);
    try {
      setRow(await setInquiryStatus(row.id, status));
      await onChanged();
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setBusy(false);
    }
  };

  const requeue = async () => {
    setBusy(true);
    try {
      await requeueNotification(row.id);
      setRow(await readInquiry(row.id));
      await onChanged();
      toast(copy.inbox.requeued, "success");
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setBusy(false);
    }
  };

  const stamp = (value: string | null) =>
    value ? new Date(value).toLocaleString(locale === "ar" ? "ar" : "en-GB") : "";

  return (
    <MediaDialog
      open
      onClose={onClose}
      title={`${copy.inbox.tabs[row.kind]} — ${row.name}`}
      closeLabel={copy.inbox.close}
      wide
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {copy.inbox.close}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`mailto:${row.email}`, "_blank")}
          >
            {copy.inbox.reply}
          </Button>
          {row.status !== "replied" ? (
            <Button size="sm" disabled={busy} onClick={() => void move("replied")}>
              {copy.inbox.markReplied}
            </Button>
          ) : null}
          {row.status !== "archived" ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void move("archived")}
            >
              {copy.inbox.archive}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void move("read")}
            >
              {copy.inbox.reopen}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {!row.notified ? (
          <div className="flex flex-col gap-2 rounded-ui bg-amber-500/[0.08] px-4 py-3">
            <p className="flex items-start gap-2 text-[12px] text-amber-900">
              <IconWarning width={14} height={14} className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-bold">{copy.inbox.notNotified}.</strong>{" "}
                {copy.inbox.notNotifiedBody}
                {row.notify_error ? (
                  <span className="mt-1 block font-mono text-[11px] opacity-80" dir="ltr">
                    {row.notify_error}
                  </span>
                ) : null}
              </span>
            </p>
            <div>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void requeue()}>
                {copy.inbox.requeue}
              </Button>
            </div>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {row.kind === "contact" ? (
            <Field
              label={copy.inbox.sendTo}
              value={row.send_to.replace(/_/g, " ")}
            />
          ) : null}
          {row.kind === "vendor" ? <Field label={copy.inbox.company} value={row.company_name} /> : null}
          <Field
            label={row.kind === "vendor" ? copy.inbox.contactPerson : copy.inbox.name}
            value={row.name}
          />
          <Field label="Email" value={row.email} />
          <Field label="Phone" value={row.phone} />
          {row.kind === "vendor" ? (
            <>
              <Field label={copy.inbox.city} value={row.city.replace(/_/g, " ")} />
              <Field label={copy.inbox.service} value={row.service_type.replace(/_/g, " ")} />
              <Field
                label={copy.inbox.aramcoVendor}
                value={
                  row.is_aramco_vendor
                    ? `${copy.inbox.aramcoYes} — ${row.aramco_vendor_id ?? ""}`
                    : copy.inbox.aramcoNo
                }
              />
            </>
          ) : null}
          <Field label={copy.inbox.received} value={stamp(row.created_at)} />
          <Field label={copy.inbox.readAt} value={stamp(row.read_at)} />
          <Field label={copy.inbox.repliedAt} value={stamp(row.replied_at)} />
          <Field label={copy.inbox.handledBy} value={row.handled_by ?? ""} />
          <Field label={copy.inbox.language} value={row.locale} />
        </dl>

        {row.kind === "career" ? (
          <div className="flex flex-col gap-2 rounded-ui border border-black/[0.07] bg-off-white px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-muted">
              {copy.inbox.cv}
            </span>
            {row.cv === null ? (
              <p className="text-xs text-gray-muted">—</p>
            ) : !row.cv.available ? (
              <p className="text-xs text-gray-muted">{copy.inbox.cvPurged}</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-heading">{row.cv.original_name}</p>
                <p className="text-[11px] text-gray-muted">
                  {copy.inbox.cvExpires} {stamp(row.cv.expires_at)}
                </p>
                <div>
                  {/* A plain link to an authenticated endpoint: the cookie
                      rides along, the response is an attachment, and the
                      server writes an access log before the bytes leave. */}
                  <a
                    href={cvDownloadUrl(row.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-ui bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                  >
                    {copy.inbox.cvDownload}
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-muted">
              {copy.inbox.message}
            </span>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-heading">
              {row.message || copy.inbox.noMessage}
            </p>
          </div>
        )}
      </div>
    </MediaDialog>
  );
}
