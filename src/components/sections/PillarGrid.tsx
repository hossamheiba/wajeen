import { SplitReveal } from "@/components/ui/SplitReveal";

interface Pillar {
  title: string;
  desc: string;
}

interface PillarGridProps {
  tag: string;
  title: string;
  description?: string;
  items: Pillar[];
  bg?: "white" | "off-white";
}

export function PillarGrid({ tag, title, description, items, bg = "white" }: PillarGridProps) {
  return (
    <section className={bg === "white" ? "bg-white py-24" : "bg-off-white py-24"}>
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">{tag}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
            {title}
          </SplitReveal>
          {description && <p className="mt-4 text-sm leading-relaxed text-gray-muted">{description}</p>}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <div
              key={p.title}
              className={`rounded-[var(--radius-md)] border border-black/5 p-6 ${
                bg === "white" ? "bg-off-white" : "bg-white"
              }`}
            >
              <div className="text-sm font-bold text-heading">{p.title}</div>
              <div className="mt-2 text-xs leading-relaxed text-gray-muted">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
