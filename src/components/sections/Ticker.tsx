import { getTranslations } from "next-intl/server";

export async function Ticker() {
  const t = await getTranslations("ticker");
  const phrases = t.raw("phrases") as string[];

  const set = (hidden: boolean) => (
    // pe-16 matches gap-16, so each set carries its own trailing gap.
    <div className="flex shrink-0 gap-16 pe-16" aria-hidden={hidden || undefined}>
      {phrases.map((phrase, i) => (
        <span
          key={i}
          className="whitespace-nowrap text-sm font-bold tracking-[0.15em] text-white/80"
        >
          {phrase}
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-y border-black/10 bg-black py-5">
      {/* The track is forced ltr — the same technique OurClients uses, which
          this component was documented as sharing but never actually did.
          `translateX(-50%)` only lands on the seam when the two identical sets
          are laid out left-to-right; under the page's own rtl direction the
          flex row reverses and the track slides away from the viewport
          instead, leaving the band empty. Each phrase still renders with its
          own bidi resolution, so Arabic reads correctly inside the span.

          The gap between the two sets lives *inside* each set (pe-16) rather
          than on the track (gap-16). With the gap on the track the total width
          is 2S + gap, so translateX(-50%) moved S + gap/2 — half a gap short of
          the seam, and the loop visibly jumped back 32px once per cycle. With
          the gap trailing each set the total is exactly 2 * (S + gap), so -50%
          lands the duplicate's first phrase precisely where the original's was.
          The spacing you see is unchanged: pe-16 is the same 4rem as gap-16. */}
      <div
        dir="ltr"
        className="flex w-max animate-[ticker_28s_linear_infinite]"
      >
        {set(false)}
        {/* Duplicate purely for the seamless loop — hidden from the
            accessibility tree so the phrases are not announced twice. */}
        {set(true)}
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
