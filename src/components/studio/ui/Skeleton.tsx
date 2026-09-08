/**
 * Loading placeholders.
 *
 * A dashboard that says "Loading…" reads as broken; a shape that matches what
 * is coming reads as fast. The shimmer is a plain CSS animation so the
 * reduced-motion guard in globals.css can stop it.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`studio-skeleton rounded-ui bg-black/[0.06] ${className}`.trim()}
    />
  );
}

export function SkeletonRows({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
