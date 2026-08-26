import { getTranslations } from "next-intl/server";

export async function Ticker() {
  const t = await getTranslations("ticker");
  const phrases = t.raw("phrases") as string[];
  const loop = [...phrases, ...phrases];

  return (
    <div className="overflow-hidden border-y border-black/10 bg-black py-5">
      <div className="flex w-max animate-[ticker_28s_linear_infinite] gap-16">
        {loop.map((phrase, i) => (
          <span key={i} className="whitespace-nowrap text-sm font-bold tracking-[0.15em] text-white/80">
            {phrase}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
