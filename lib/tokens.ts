import { randomBytes, createHash } from "crypto";

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cryptographically secure one-time redemption token, e.g. MEHFIL-RWD-<hex>. */
export function generateRedemptionToken(): string {
  return `MEHFIL-RWD-${randomBytes(24).toString("hex").toUpperCase()}`;
}

/** Extract raw token from a scanned QR payload (supports raw token or URL containing token). */
export function extractTokenFromQrPayload(payload: string): string {
  const trimmed = payload.trim();
  // Support URLs like https://app/rewards/claim?token=XXX or .../redeem/XXX
  const tokenMatch = trimmed.match(/MEHFIL-RWD-[A-Fa-f0-9]+/);
  if (tokenMatch) return tokenMatch[0].toUpperCase();
  return trimmed.toUpperCase();
}
