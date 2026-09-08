"use client";

/**
 * Nothing goes live from one click.
 *
 * Publishing promotes every pending draft at once, so this screen shows the
 * whole set, what each one changes, and whether the two languages still line
 * up — the server refuses a publish where they have drifted, and finding that
 * out here is better than finding it out from an error.
 *
 * The confirm step is deliberate. It is the only action in the studio that
 * changes what the public sees.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, StatusPill } from "@/components/studio/ui/Badge";
import { Button } from "@/components/studio/ui/Button";
import { SkeletonRows } from "@/components/studio/ui/Skeleton";
import { SectionLabel, Surface } from "@/components/studio/ui/Surface";
import { useToast } from "@/components/studio/ui/Toast";
import { IconCheck, IconWarning } from "@/components/studio/icons";
import {
  ApiError,
  publish,
  readBlock,
  readDraftMessages,
  type BlockSummary,
} from "@/lib/studio/api";
import { diffPaths, keyPaths, type PathDiff } from "@/lib/studio/paths";
import { rootName } from "@/lib/studio/ui";
import { studioCopy } from "@/lib/studio/i18n";
import { usePageMeta, useStudio } from "../StudioShell";

interface PendingChange {
  block: BlockSummary;
  diff: PathDiff;
}

export function PublishReview({ locale }: { locale: string }) {
  const { blocks, reload } = useStudio();
  const toast = useToast();
  const copy = studioCopy(locale);

  const [pending, setPending] = useState<PendingChange[] | null>(null);
  const [parity, setParity] = useState<{ ok: boolean; detail: string } | null>(null);
  const [label, setLabel] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const drafts = (blocks?.blocks ?? []).filter((block) => block.has_draft);
  const current = blocks?.currentRevision ?? null;

  usePageMeta(
    {
      title: copy.publish.title,
      subtitle: drafts.length
        ? copy.publish.subtitle(drafts.length)
        : copy.publish.subtitleNone,
    },
    [locale, drafts.length],
  );

  const inspect = useCallback(async () => {
    const changes = await Promise.all(
      drafts.map(async (block) => {
        const detail = await readBlock(block.namespace, block.locale);
        return {
          block,
          diff: diffPaths(detail.published, detail.draft ?? detail.published),
        };
      }),
    );
    setPending(changes);

    // The same check the server runs before it writes a version.
    const [en, ar] = await Promise.all([readDraftMessages("en"), readDraftMessages("ar")]);
    const enPaths = new Set(keyPaths(en));
    const arPaths = new Set(keyPaths(ar));
    const missing = [...enPaths].filter((path) => !arPaths.has(path));
    const extra = [...arPaths].filter((path) => !enPaths.has(path));

    setParity(
      missing.length || extra.length
        ? { ok: false, detail: copy.publish.parityBadBody }
        : { ok: true, detail: copy.publish.parityOkBody },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (blocks) void inspect();
  }, [blocks, inspect]);

  async function ship() {
    setBusy(true);
    try {
      const version = await publish(label, current);
      toast(copy.publish.done(version.number));
      setLabel("");
      setConfirming(false);
      await reload();
      await inspect();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.detail : copy.publish.failed, "error");
    } finally {
      setBusy(false);
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <Surface className="py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-700">
            <IconCheck width={22} height={22} />
          </span>
          <p className="mt-4 text-sm font-bold text-heading">
            {copy.publish.upToDateTitle}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-gray-muted">
            {copy.publish.upToDateBody(current !== null ? String(current) : null)}
          </p>
          <div className="mt-5">
            <Link href={`/${locale}/studio/sections`} className="contents">
              <Button variant="secondary">{copy.overview.browse}</Button>
            </Link>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {parity ? (
        <Surface
          className={parity.ok ? "" : "border-red-200 bg-red-50/60"}
        >
          <div className="flex items-start gap-3">
            {parity.ok ? (
              <IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <IconWarning width={18} height={18} className="mt-0.5 shrink-0 text-red-600" />
            )}
            <div>
              <p
                className={`text-sm font-bold ${parity.ok ? "text-heading" : "text-red-800"}`}
              >
                {parity.ok ? copy.publish.parityOk : copy.publish.parityBad}
              </p>
              <p className="mt-0.5 text-xs text-gray-muted">{parity.detail}</p>
            </div>
          </div>
        </Surface>
      ) : null}

      <section>
        <SectionLabel>{copy.publish.changes}</SectionLabel>
        <Surface padded={false} className="mt-3 overflow-hidden">
          {pending === null ? (
            <div className="p-4">
              <SkeletonRows rows={3} label={copy.common.loading} />
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {pending.map(({ block, diff }) => (
                <li
                  key={`${block.namespace}-${block.locale}`}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-heading">
                      {rootName(block.namespace, locale)}
                    </span>
                    <span className="block text-xs text-gray-muted">
                      {copy.publish.counts(
                        diff.changed.length,
                        diff.added.length,
                        diff.removed.length,
                      )}
                    </span>
                  </span>
                  <Badge tone="neutral">{block.locale.toUpperCase()}</Badge>
                  <StatusPill tone="draft">{copy.publish.changed}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </section>

      <Surface>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <SectionLabel>{copy.publish.liveNow}</SectionLabel>
            <p className="mt-1 text-2xl font-black tracking-tight text-gray-muted">
              #{current ?? "—"}
            </p>
          </div>
          <div className="text-2xl text-gray-muted/50">&rarr;</div>
          <div>
            <SectionLabel>{copy.publish.afterPublishing}</SectionLabel>
            <p className="mt-1 text-2xl font-black tracking-tight text-heading">
              #{current !== null ? current + 1 : "—"}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-black/[0.06] pt-4">
          <label htmlFor="publish-label" className="mb-1.5 block text-xs font-bold text-heading">
            {copy.publish.labelField}{" "}
            <span className="font-medium text-gray-muted">{copy.publish.optional}</span>
          </label>
          <input
            id="publish-label"
            type="text"
            value={label}
            placeholder={copy.publish.labelPlaceholder}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-ui border border-black/10 bg-white px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          {confirming ? (
            <div className="mt-4 rounded-ui border border-primary/25 bg-primary/[0.04] p-4">
              <p className="text-sm font-bold text-heading">
                {copy.publish.confirmTitle(drafts.length)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-muted">
                {copy.publish.confirmBody(current !== null ? String(current) : "—")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={ship} disabled={busy}>
                  {busy ? copy.publish.publishing : copy.publish.confirmYes}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                  {copy.common.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <Button
                onClick={() => setConfirming(true)}
                disabled={parity?.ok === false || pending === null}
              >
                {copy.publish.action(drafts.length)}
              </Button>
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
