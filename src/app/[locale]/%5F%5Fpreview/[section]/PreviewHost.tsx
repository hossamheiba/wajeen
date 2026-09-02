"use client";

/**
 * Renders one real section with messages that the studio can replace live.
 *
 * The only thing this file does is own the message tree. The section itself is
 * pulled from the registry and rendered untouched — it still calls
 * `useTranslations(...)` and has no idea it is being previewed. A nested
 * `NextIntlClientProvider` wins over the one in the locale layout, so swapping
 * state here re-renders the section with the draft and nothing else changes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  PREVIEW_PROTOCOL_VERSION,
  getAtPath,
  isPreviewMessage,
  setAtPath,
  type PreviewMessage,
} from "@/lib/preview/contract";
import { getPreviewEntry } from "@/lib/preview/registry";

type Messages = Record<string, unknown>;

export function PreviewHost({
  locale,
  section,
  initialMessages,
}: {
  locale: string;
  section: string;
  initialMessages: Messages;
}) {
  const entry = getPreviewEntry(section);
  const [messages, setMessages] = useState<Messages>(initialMessages);

  const post = useCallback((message: PreviewMessage) => {
    if (typeof window === "undefined" || window.parent === window) return;
    // Never "*": the studio is same-origin, so name it.
    window.parent.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    if (!entry) return;

    const onMessage = (event: MessageEvent) => {
      // Origin check first, before the payload is even inspected.
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type !== "wjeen:preview:update") return;

      const { namespace, data } = event.data;
      if (namespace !== entry.namespace) {
        post({
          type: "wjeen:preview:error",
          v: PREVIEW_PROTOCOL_VERSION,
          message: `This frame renders "${entry.namespace}", received "${namespace}".`,
        });
        return;
      }

      try {
        // `setAtPath`, not a flat assignment: ten namespaces are nested paths,
        // and writing one as a literal dotted key would leave the section
        // reading the old value while a bogus key accumulated beside it.
        setMessages((current) => setAtPath(current, namespace, data));
      } catch (error) {
        post({
          type: "wjeen:preview:error",
          v: PREVIEW_PROTOCOL_VERSION,
          message: error instanceof Error ? error.message : "Failed to apply update.",
        });
      }
    };

    window.addEventListener("message", onMessage);
    // Announce only once the listener is attached, so the studio's first
    // update cannot land in the gap before this effect runs.
    post({ type: "wjeen:preview:ready", v: PREVIEW_PROTOCOL_VERSION });

    return () => window.removeEventListener("message", onMessage);
  }, [entry, post]);

  const Section = useMemo(() => entry?.Component, [entry]);

  /**
   * Props for the prop-driven entries. Read from the live message tree so a
   * `PageHeader` updates on the same keystroke a namespace-reading section
   * does — the adapter is where the draft turns into props, and it runs on
   * every render rather than once at mount.
   */
  const sectionProps = useMemo(() => {
    if (!entry?.toProps) return {};
    const ns = getAtPath(messages, entry.namespace);
    return ns ? entry.toProps(ns) : {};
  }, [entry, messages]);

  if (!entry || !Section) {
    return (
      <div className="container-page section-y">
        <p className="t-body text-gray-muted">
          No preview is registered for the section <code>{section}</code>.
        </p>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Section {...sectionProps} />
    </NextIntlClientProvider>
  );
}
