import prisma from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LOYALTY_CONFIG } from "@/lib/loyalty/config";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const [progress, rewards, recentPurchases] = await Promise.all([
      prisma.loyaltyProgress.findUnique({ where: { userId: auth.user.id } }),
      prisma.reward.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.purchase.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
    const chai = progress?.chaiCount ?? 0;
    const maggie = progress?.maggieCount ?? 0;
    const visits = progress?.eligibleVisitCount ?? 0;
    return Response.json({
      user: auth.user,
      progress: { chaiCount: chai, maggieCount: maggie, eligibleVisitCount: visits },
      thresholds: {
        chai: LOYALTY_CONFIG.CHAI.threshold,
        maggie: LOYALTY_CONFIG.MAGGIE.threshold,
        visits: LOYALTY_CONFIG.VISITS.threshold,
        visitMinAmount: LOYALTY_CONFIG.VISITS.minimumAmount,
      },
      rewards,
      recentPurchases,
    });
  } catch (e) {
    console.error("dashboard error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
