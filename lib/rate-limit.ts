// Simple in-memory rate limiter (per server instance).
// Suitable for zero-cost single-instance deployment. For multi-instance,
// replace with a shared store (e.g. Postgres/Redis).

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

const MAX_BUCKETS = 5000;

function pruneExpired(now: number) {
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
  // If still over capacity (many distinct keys), drop oldest first.
  // Map preserves insertion order, so the first key is the oldest.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) pruneExpired(now);
  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

export function loginRateLimitKey(ip: string, username: string): string {
  return `login:${ip}:${username.toLowerCase()}`;
}

export function purchaseRateLimitKey(userId: string): string {
  return `purchase:${userId}`;
}

export function signupRateLimitKey(ip: string): string {
  return `signup:${ip}`;
}
