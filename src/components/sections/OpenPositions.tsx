import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Position {
  title: string;
  department: string;
  location: string;
  type: string;
}

export async function OpenPositions() {
  const t = await getTranslations("careersPage.positions");
  const items = t.raw("items") as Position[];

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
            <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
              {t("title")}
            </SplitReveal>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>

        <div className="mt-12 flex flex-col divide-y divide-black/5 overflow-hidden rounded-[var(--radius-lg)] border border-black/5 bg-off-white">
          {items.map((pos) => (
            <div
              key={pos.title}
              className="flex flex-col gap-4 p-6 transition-colors hover:bg-white sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-base font-bold text-heading">{pos.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-muted">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                    {pos.department}
                  </span>
                  <span>📍 {pos.location}</span>
                  <span>{pos.type}</span>
                </div>
              </div>
              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {t("applyLabel")} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
