import prisma from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { purchaseSchema, derivePaymentMode } from "@/lib/validation";
import { checkRateLimit, purchaseRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const rl = checkRateLimit(purchaseRateLimitKey(auth.user.id), 20, 60 * 60 * 1000);
    if (!rl.allowed) {
      return Response.json(
        { error: "Too many purchase requests. Please try again later." },
        { status: 429 }
      );
    }
    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid purchase." },
        { status: 400 }
      );
    }
    const d = parsed.data;
    // Resolve effective type + quantities (legacy + multi-item compatible).
    let purchaseType: "CHAI" | "MAGGIE" | "VISIT" | "COMBO" = "VISIT";
    let chaiQty = d.chaiQty ?? 0;
    let maggieQty = d.maggieQty ?? 0;
    if (d.purchaseType && (chaiQty + maggieQty === 0) && !d.visitOnly) {
      // Legacy single-item submission
      purchaseType = d.purchaseType;
      if (d.purchaseType === "CHAI") chaiQty = 1;
      if (d.purchaseType === "MAGGIE") maggieQty = 1;
    } else if (chaiQty > 0 && maggieQty > 0) {
      purchaseType = "COMBO";
    } else if (chaiQty > 0) {
      purchaseType = "CHAI";
    } else if (maggieQty > 0) {
      purchaseType = "MAGGIE";
    } else {
      purchaseType = "VISIT";
    }
    const transactionRef = d.transactionRef.trim().slice(0, 100);
    // Payment mode is derived from the ref ("0000" = offline) - never trusted from the client.
    const paymentMode = derivePaymentMode(transactionRef);
    const purchase = await prisma.purchase.create({
      data: {
        userId: auth.user.id,
        purchaseType,
        chaiQty,
        maggieQty,
        amount: d.amount,
        paymentMode,
        transactionRef,
        notes: d.notes?.slice(0, 300) || null,
        status: "PENDING",
      },
    });
    return Response.json({ ok: true, purchase }, { status: 201 });
  } catch (e) {
    console.error("create purchase error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where: { userId: string; status?: "PENDING" | "APPROVED" | "REJECTED" } = { userId: auth.user.id };
    if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
      where.status = status;
    }
    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ purchases });
  } catch (e) {
    console.error("list purchases error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
