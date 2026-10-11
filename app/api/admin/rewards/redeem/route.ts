import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { extractTokenFromQrPayload } from "@/lib/tokens";
import { redeemSchema } from "@/lib/validation";

// POST /api/admin/rewards/redeem  { token }
// Also supports lookup: POST /api/admin/rewards/lookup { token } via ?mode=lookup
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "redeem";
    const body = await req.json().catch(() => ({}));
    const parsed = redeemSchema.safeParse({ token: String(body.token ?? "") });
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Reward token is required." },
        { status: 400 }
      );
    }
    const token = extractTokenFromQrPayload(parsed.data.token);

    if (mode === "lookup") {
      const reward = await prisma.reward.findUnique({
        where: { redemptionToken: token },
        include: { user: { select: { username: true, displayName: true } } },
      });
      if (!reward) return Response.json({ error: "Invalid reward.", valid: false }, { status: 404 });
      if (reward.status === "REDEEMED") {
        return Response.json(
          { error: "Reward already redeemed.", valid: false, reward },
          { status: 409 }
        );
      }
      if (reward.status === "CANCELLED") {
        return Response.json(
          { error: "Reward cancelled.", valid: false, reward },
          { status: 410 }
        );
      }
      if (reward.status !== "CLAIMED") {
        return Response.json(
          { error: "Reward is not ready to redeem.", valid: false, reward },
          { status: 400 }
        );
      }
      return Response.json({ valid: true, reward });
    }

    // Redeem (transactional, one-time use). The status flip is guarded
    // (CLAIMED -> REDEEMED) so two concurrent scans cannot double-spend.
    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({
        where: { redemptionToken: token },
        include: { user: { select: { username: true, displayName: true } } },
      });
      if (!reward) return { error: "Invalid reward.", status: 404 } as const;
      if (reward.status === "REDEEMED") {
        return { error: "Reward already redeemed.", status: 409 } as const;
      }
      if (reward.status === "CANCELLED") {
        return { error: "Reward cancelled.", status: 410 } as const;
      }
      if (reward.status !== "CLAIMED") {
        return { error: "Reward is not ready to redeem.", status: 400 } as const;
      }
      const marked = await tx.reward.updateMany({
        where: { id: reward.id, status: "CLAIMED" },
        data: { status: "REDEEMED", redeemedAt: new Date(), redeemedBy: auth.user.id },
      });
      if (marked.count !== 1) {
        return { error: "Reward already redeemed.", status: 409 } as const;
      }
      const updated = await tx.reward.findUnique({
        where: { id: reward.id },
        include: { user: { select: { username: true, displayName: true } } },
      });
      if (!updated) return { error: "Invalid reward.", status: 404 } as const;
      await tx.adminAction.create({
        data: {
          adminId: auth.user.id,
          actionType: "REWARD_REDEEM",
          targetType: "REWARD",
          targetId: reward.id,
          details: `Redeemed ${reward.rewardType} for user ${reward.userId} (token ${token.slice(0, 18)}…)`,
        },
      });
      return { ok: true, reward: updated } as const;
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true, reward: result.reward });
  } catch (e) {
    console.error("redeem error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
