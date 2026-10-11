import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeApprovalDelta, applyApprovalToProgress } from "@/lib/loyalty/engine";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id } });
      if (!purchase) return { error: "Purchase not found.", status: 404 } as const;
      if (purchase.status !== "PENDING") {
        return { error: "Purchase already processed.", status: 409 } as const;
      }

      // Atomically mark APPROVED only if still PENDING (duplicate-click safe).
      const marked = await tx.purchase.updateMany({
        where: { id: purchase.id, status: "PENDING" },
        data: { status: "APPROVED", approvedAt: new Date(), approvedBy: auth.user.id },
      });
      if (marked.count !== 1) {
        return { error: "Purchase already processed.", status: 409 } as const;
      }

      // Ensure loyalty row exists.
      let progress = await tx.loyaltyProgress.findUnique({
        where: { userId: purchase.userId },
      });
      if (!progress) {
        progress = await tx.loyaltyProgress.create({
          data: { userId: purchase.userId },
        });
      }

      const delta = computeApprovalDelta(
        purchase.purchaseType as "CHAI" | "MAGGIE" | "VISIT" | "COMBO",
        purchase.amount,
        { chaiQty: purchase.chaiQty ?? 0, maggieQty: purchase.maggieQty ?? 0 }
      );
      const { next, rewards } = applyApprovalToProgress(
        {
          chaiCount: progress.chaiCount,
          maggieCount: progress.maggieCount,
          eligibleVisitCount: progress.eligibleVisitCount,
        },
        delta
      );

      await tx.loyaltyProgress.update({
        where: { userId: purchase.userId },
        data: {
          chaiCount: next.chaiCount,
          maggieCount: next.maggieCount,
          eligibleVisitCount: next.eligibleVisitCount,
        },
      });

      const createdRewards = [];
      for (const r of rewards) {
        const created = await tx.reward.create({
          data: { userId: purchase.userId, rewardType: r.rewardType, status: "AVAILABLE" },
        });
        createdRewards.push(created);
      }

      await tx.adminAction.create({
        data: {
          adminId: auth.user.id,
          actionType: "PURCHASE_APPROVE",
          targetType: "PURCHASE",
          targetId: purchase.id,
          details: `Approved ${purchase.purchaseType} (chai x${purchase.chaiQty ?? 0}, maggie x${purchase.maggieQty ?? 0}) ₹${purchase.amount} [${purchase.paymentMode}${purchase.transactionRef ? " " + purchase.transactionRef : ""}] for user ${purchase.userId}; rewards: ${createdRewards.map((r) => r.rewardType).join(",") || "none"}`,
        },
      });

      return { ok: true, rewards: createdRewards, progress: next } as const;
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true, rewards: result.rewards, progress: result.progress });
  } catch (e) {
    console.error("approve error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
