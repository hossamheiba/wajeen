/**
 * Fixed-window rate limiter held in module memory.
 *
 * IMPORTANT — this is NOT distributed rate limiting. The counters live in the
 * memory of a single server instance, so every instance enforces its own
 * budget: on a serverless or multi-instance host the effective allowance is
 * the limit multiplied by however many instances are warm, and it resets
 * whenever an instance is recycled. Treat it as baseline protection against
 * casual flooding, not as a guarantee. A distributed store (Redis/KV) is the
 * real answer, and that is an infrastructure decision tied to the host.
 *
 * The window is deliberately generous. Visitors behind carrier-grade NAT or a
 * corporate gateway share one address, so a tight limit would reject genuine
 * enquiries from a whole office; the goal is to stop a flood, not to police
 * ordinary use.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — for a Retry-After header. */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 10 * 60 * 1000 } = {},
): RateLimitResult {
  const now = Date.now();

  // Cheap amortised cleanup: only walk the map when it is worth walking.
  if (buckets.size > 500) sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort client address.
 *
 * `NextRequest.ip` was removed in Next 15, so this reads the forwarding
 * headers a proxy sets. The value is client-controllable when the app is not
 * behind a trusted proxy, which is another reason this limiter is a baseline
 * rather than a control you can rely on.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
