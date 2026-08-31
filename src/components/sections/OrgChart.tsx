"use client";

/**
 * Organisation chart — page 12 of the company profile.
 *
 * Drawn as a two-level structure rather than a literal reproduction of the
 * PDF's boxes-and-lines diagram: a wide org chart cannot be made to work on a
 * phone, and a client reading this wants to know which departments exist and
 * what each covers. The board and its two vice-presidencies sit above; the ten
 * departments tile below them.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Dept {
  title: string;
  desc: string;
}

export function OrgChart() {
  const t = useTranslations("orgChart");
  const reduce = useReducedMotion();
  const departments = t.raw("departments") as Dept[];

  return (
    <section className="section-y bg-white">
      <div className="container-page">
        <SectionHeading
          eyebrow={t("tag")}
          title={t("title")}
          description={t("description")}
          className="max-w-3xl"
        />

        {/* Board + the units reporting straight to it */}
        <div className="mt-12 rounded-frame bg-primary p-7 text-center shadow-[var(--shadow-lift)]">
          <div className="t-h5 text-white">{t("board")}</div>
          <div className="t-small mt-2 text-white/70">{t("direct")}</div>
        </div>

        {/* The two vice-presidencies */}
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[t("vp1"), t("vp2")].map((vp) => (
            <div
              key={vp}
              className="rounded-frame border border-black/5 bg-off-white p-5 text-center"
            >
              <span className="t-h5 text-heading">{vp}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {departments.map((d, i) => (
            <motion.div
              key={d.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: reduce ? 0 : 0.4,
                delay: reduce ? 0 : (i % 5) * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="card"
            >
              <div className="t-eyebrow text-primary">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="t-h5 mt-2 text-heading">{d.title}</h3>
              <p className="t-small mt-1.5 text-gray-muted">{d.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
