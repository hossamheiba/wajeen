"use client";

/**
 * Certificates & registrations — the profile's certificate section (pages
 * 39–47) as a list of what the company actually holds.
 *
 * The profile reproduces the certificate scans themselves; those are legal
 * documents with registration numbers on them, so the site names what is held
 * rather than publishing the scans. If the client wants the documents online
 * they can be added as downloads later.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Cert {
  title: string;
  desc: string;
}

export function Certificates() {
  const t = useTranslations("certificates");
  const reduce = useReducedMotion();
  const items = t.raw("items") as Cert[];

  return (
    <section className="section-y bg-off-white">
      <div className="container-page">
        <SectionHeading
          eyebrow={t("tag")}
          title={t("title")}
          description={t("description")}
          className="max-w-3xl"
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: reduce ? 0 : 0.45,
                delay: reduce ? 0 : (i % 3) * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="card flex gap-4"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui bg-primary/10 text-primary"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="9" r="5" />
                  <path d="m8.5 13.5-1 7.5 4.5-2.5 4.5 2.5-1-7.5M10 9l1.5 1.5L14.5 7.5" />
                </svg>
              </span>
              <div>
                <h3 className="t-h5 text-heading">{item.title}</h3>
                <p className="t-small mt-1.5 text-gray-muted">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
