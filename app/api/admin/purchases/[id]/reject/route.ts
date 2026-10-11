import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rejectSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason?.slice(0, 200) ?? "" : "";

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id } });
      if (!purchase) return { error: "Purchase not found.", status: 404 } as const;
      if (purchase.status !== "PENDING") {
        return { error: "Purchase already processed.", status: 409 } as const;
      }
      const marked = await tx.purchase.updateMany({
        where: { id: purchase.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: reason || null,
        },
      });
      if (marked.count !== 1) {
        return { error: "Purchase already processed.", status: 409 } as const;
      }
      await tx.adminAction.create({
        data: {
          adminId: auth.user.id,
          actionType: "PURCHASE_REJECT",
          targetType: "PURCHASE",
          targetId: purchase.id,
          details: `Rejected ${purchase.purchaseType} ₹${purchase.amount} for user ${purchase.userId}; reason: ${reason || "n/a"}`,
        },
      });
      return { ok: true } as const;
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("reject error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
