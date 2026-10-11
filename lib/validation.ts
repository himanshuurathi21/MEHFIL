import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter a valid email address.")
  .max(100, "Email is too long.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(100, "Password is too long.");

export const signupSchema = z
  .object({
    // Users sign up with their email address (stored as username).
    // Admin accounts may keep non-email usernames; login accepts both.
    username: emailSchema,
    displayName: z.string().trim().min(1, "Display name is required.").max(50),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export const purchaseSchema = z
  .object({
    // Legacy single-type (backward compatible)
    purchaseType: z.enum(["CHAI", "MAGGIE", "VISIT", "COMBO"]).optional(),
    // Multi-item quantities (one transaction can have chai + maggie together)
    chaiQty: z.coerce.number().int().min(0).max(20).optional().default(0),
    maggieQty: z.coerce.number().int().min(0).max(20).optional().default(0),
    // Strict boolean: the client sends real JSON booleans. (z.coerce.boolean()
    // would turn the string "false" into true - a classic coercion footgun.)
    visitOnly: z.boolean().optional().default(false),
    amount: z.coerce.number().int().min(1).max(100000),
    // Always required: the real UPI ref, or "0000" when payment was offline.
    // Payment mode is derived server-side (see derivePaymentMode) - never trusted from the client.
    transactionRef: z
      .string()
      .trim()
      .min(3, "Enter Transaction ID (type 0000 if payment was offline).")
      .max(100),
    notes: z.string().max(300).optional(),
  })
  .superRefine((d, ctx) => {
    const hasLegacy = !!d.purchaseType;
    const hasQty = (d.chaiQty ?? 0) + (d.maggieQty ?? 0) > 0;
    if (!hasLegacy && !hasQty && !d.visitOnly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one item (Chai / Maggie / Visit).",
      });
    }
  });

/** Derive payment mode from the transaction ref: exactly "0000" means offline. */
export function derivePaymentMode(transactionRef: string): "OFFLINE" | "ONLINE" {
  return transactionRef.trim() === "0000" ? "OFFLINE" : "ONLINE";
}

export const rejectSchema = z.object({
  reason: z.string().max(200).optional().default(""),
});

export const redeemSchema = z.object({
  token: z.string().trim().min(8).max(100),
});
