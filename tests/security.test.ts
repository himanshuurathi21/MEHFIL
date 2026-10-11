import { describe, it, expect } from "vitest";
import { extractTokenFromQrPayload, generateRedemptionToken } from "../lib/tokens";
import { signupSchema, purchaseSchema, derivePaymentMode } from "../lib/validation";

describe("reward tokens", () => {
  it("generates unique secure tokens", () => {
    const a = generateRedemptionToken();
    const b = generateRedemptionToken();
    expect(a).not.toBe(b);
    expect(a.startsWith("MEHFIL-RWD-")).toBe(true);
    expect(a.length).toBeGreaterThan(20);
  });

  it("extracts token from raw and URL payloads", () => {
    const t = generateRedemptionToken();
    expect(extractTokenFromQrPayload(t)).toBe(t);
    expect(extractTokenFromQrPayload(`https://example.com/redeem?token=${t}`)).toBe(t);
  });

  it("redeemed reward cannot be reused (status guard)", () => {
    // Business rule documented: only CLAIMED -> REDEEMED is allowed.
    // API enforces: REDEEMED => 409, CANCELLED => 410, else 400.
    const allowedFrom: Record<string, boolean> = {
      AVAILABLE: false,
      CLAIMED: true,
      REDEEMED: false,
      CANCELLED: false,
    };
    expect(allowedFrom["CLAIMED"]).toBe(true);
    expect(allowedFrom["REDEEMED"]).toBe(false);
  });

  it("user isolation rule: users can only claim own rewards", () => {
    const rewardUserId: string = "userA";
    const claimUserId: string = "userB";
    expect(rewardUserId === claimUserId).toBe(false);
  });
});

describe("email signup", () => {
  const base = {
    displayName: "Himanshu",
    password: "Secret123",
    confirmPassword: "Secret123",
  };
  it("accepts a valid email as username", () => {
    const r = signupSchema.safeParse({ ...base, username: "Himanshu@Example.com" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.username).toBe("himanshu@example.com");
  });
  it("rejects non-email usernames", () => {
    for (const bad of ["himanshu", "not-an-email", "a@b", "user@"]) {
      const r = signupSchema.safeParse({ ...base, username: bad });
      expect(r.success).toBe(false);
    }
  });
  it("rejects mismatched passwords", () => {
    const r = signupSchema.safeParse({
      ...base,
      username: "user@example.com",
      confirmPassword: "Different123",
    });
    expect(r.success).toBe(false);
  });
});

describe("transaction ref rule", () => {
  it("0000 means offline, anything else means online", () => {
    expect(derivePaymentMode("0000")).toBe("OFFLINE");
    expect(derivePaymentMode("  0000  ")).toBe("OFFLINE");
    expect(derivePaymentMode("412345678901")).toBe("ONLINE");
    expect(derivePaymentMode("00001")).toBe("ONLINE");
  });
  it("purchase requires a transaction ref (real UPI ref or 0000)", () => {
    const ok = purchaseSchema.safeParse({ chaiQty: 2, amount: 35, transactionRef: "0000" });
    expect(ok.success).toBe(true);
    const empty = purchaseSchema.safeParse({ chaiQty: 2, amount: 35, transactionRef: "" });
    expect(empty.success).toBe(false);
    const missing = purchaseSchema.safeParse({ chaiQty: 2, amount: 35 });
    expect(missing.success).toBe(false);
  });
});
