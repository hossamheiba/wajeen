import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

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
    <section className="bg-white section-y">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <SectionHeading eyebrow={t("tag")} title={t("title")} />
          </div>
          <p className="max-w-md t-small text-gray-muted">{t("description")}</p>
        </div>

        {items.length === 0 ? (
          <div className="card mt-12 text-center">
            <p className="t-small mx-auto max-w-xl text-gray-muted">{t("emptyState")}</p>
          </div>
        ) : (
        <div className="mt-12 flex flex-col divide-y divide-black/5 overflow-hidden rounded-frame border border-black/5 bg-off-white">
          {items.map((pos) => (
            <div
              key={pos.title}
              className="flex flex-col gap-4 p-6 transition-colors hover:bg-white sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-base font-bold text-heading">{pos.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-muted">
                  <span className="rounded-ui bg-primary/10 px-3 py-1 font-semibold text-primary">
                    {pos.department}
                  </span>
                  <span>📍 {pos.location}</span>
                  <span>{pos.type}</span>
                </div>
              </div>
              <Button
                href="/contact"
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {t("applyLabel")}{" "}
                <span aria-hidden="true" className="inline-block rtl:rotate-180">
                  →
                </span>
              </Button>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
