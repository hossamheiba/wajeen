import { SectionHeading } from "@/components/ui/SectionHeading";

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
      <div className="container-page">
        <div className="max-w-2xl">
          <SectionHeading eyebrow={tag} title={title} />
          {description && <p className="mt-4 t-small text-gray-muted">{description}</p>}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <div
              key={p.title}
              className={`rounded-ui border border-black/5 p-6 ${
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
