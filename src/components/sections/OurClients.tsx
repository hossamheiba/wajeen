/**
 * Our Clients — a dual-row marquee, opposite directions, of logo-mark tiles.
 *
 * No real client logos exist yet, so this stands in with generic
 * institutional glyphs (one per sector the label describes) instead of
 * typeset names — reads as a row of anonymized marks, closer to what the
 * real logos will look like, until the client supplies them to swap in.
 */

import { getTranslations } from "next-intl/server";

interface ClientItem {
  label: string;
}

const ICON_BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** One mark per `clients.items` entry, in order (government, energy, real
 * estate, industrial, financial, regulatory, utility, investor). */
const CLIENT_ICONS = [
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 10h16M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18M12 3 3 8h18L12 3Z" />
    </svg>
  ),
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" strokeLinejoin="round" />
    </svg>
  ),
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" />
    </svg>
  ),
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 21V11l5-3v13M9 21V8l6 3v10M15 21v-6l5-3v9" />
    </svg>
  ),
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.3c0-1.3 1.1-2.3 2.5-2.3s2.5 1 2.5 2.1c0 2.9-5 1.4-5 4.3 0 1.2 1.1 2.1 2.5 2.1s2.5-1 2.5-2.3" />
    </svg>
  ),
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M12 3v3M5 8h14M7 8l-3 6a3 3 0 0 0 6 0l-3-6ZM17 8l-3 6a3 3 0 0 0 6 0l-3-6ZM7 21h10M12 11v10" />
    </svg>
  ),
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  ),
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 19h16M6 19v-6l4-2 4 3 4-5v10" />
    </svg>
  ),
];

export async function OurClients() {
  const t = await getTranslations("clients");
  const items = t.raw("items") as ClientItem[];

  const rowA = [...items, ...items];
  const rowB = [...items.slice().reverse(), ...items.slice().reverse()];

  const Tile = ({ label, index }: { label: string; index: number }) => {
    const Icon = CLIENT_ICONS[index % CLIENT_ICONS.length];
    return (
      <div
        title={label}
        aria-label={label}
        className="flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-heading/50 grayscale transition-all duration-300 hover:grayscale-0 hover:border-primary/30 hover:text-primary hover:shadow-[0_12px_28px_-14px_var(--color-primary-glow)]"
      >
        {Icon("h-8 w-8")}
      </div>
    );
  };

  return (
    <section id="clients" className="overflow-hidden bg-off-white py-24">
      <style>{`
        @keyframes clientsMarqueeA { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes clientsMarqueeB { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .clients-row-a { animation: clientsMarqueeA 34s linear infinite; }
        .clients-row-b { animation: clientsMarqueeB 34s linear infinite; }
        .clients-row-a:hover, .clients-row-b:hover { animation-play-state: paused; }
      `}</style>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("tag")}
          </div>
          <h2 className="mt-2 text-3xl font-black leading-[1.15] text-heading lg:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>
      </div>

      <div className="relative mt-14 space-y-5">
        {/* Physical left/right on purpose — these mask the true viewport
            edges the marquee is clipped at, which doesn't move with reading
            direction the way start/end would. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-off-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-off-white to-transparent" />

        <div className="flex w-max gap-4 clients-row-a">
          {rowA.map((item, i) => (
            <Tile key={`a-${i}`} label={item.label} index={i % items.length} />
          ))}
        </div>
        <div className="flex w-max gap-4 clients-row-b">
          {rowB.map((item, i) => (
            <Tile key={`b-${i}`} label={item.label} index={items.length - 1 - (i % items.length)} />
          ))}
        </div>
      </div>
    </section>
  );
}
