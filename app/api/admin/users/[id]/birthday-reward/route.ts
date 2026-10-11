import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) return { error: "User not found.", status: 404 } as const;
      if (user.role !== "USER") {
        return { error: "Only customers get birthday gifts.", status: 400 } as const;
      }
      // One unredeemed birthday gift at a time (idempotent-ish).
      const existing = await tx.reward.findFirst({
        where: { userId: id, rewardType: "BIRTHDAY_CHAI", status: { in: ["AVAILABLE", "CLAIMED"] } },
      });
      if (existing) {
        return { error: "Birthday gift already given (not yet redeemed).", status: 409 } as const;
      }
      const reward = await tx.reward.create({
        data: { userId: id, rewardType: "BIRTHDAY_CHAI", status: "AVAILABLE" },
      });
      await tx.adminAction.create({
        data: {
          adminId: auth.user.id,
          actionType: "REWARD_BIRTHDAY",
          targetType: "REWARD",
          targetId: reward.id,
          details: `Birthday Free Chai gifted to ${user.username} by ${auth.user.username}`,
        },
      });
      return { ok: true, reward } as const;
    });
    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true, reward: result.reward });
  } catch (e) {
    console.error("birthday gift error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
