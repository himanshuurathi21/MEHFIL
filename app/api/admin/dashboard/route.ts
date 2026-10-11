import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

async function upcomingBirthdays() {
  // Day/month match for next 7 days (year ignored). Small shop scale: scan users with birthdate set.
  try {
    const users = await prisma.user.findMany({
      where: { role: "USER", birthdate: { not: null } },
      select: { id: true, username: true, displayName: true, birthdate: true },
      take: 500,
    });
    const out: Array<{ id: string; username: string; displayName: string; day: number; month: number; inDays: number }> = [];
    // "Today" in IST so birthday badges match the shop's calendar day.
    const IST_DAY_MS = 5.5 * 60 * 60 * 1000;
    const nowIstWall = new Date(Date.now() + IST_DAY_MS);
    const today = new Date(
      Date.UTC(nowIstWall.getUTCFullYear(), nowIstWall.getUTCMonth(), nowIstWall.getUTCDate())
    );
    for (const u of users) {
      if (!u.birthdate) continue;
      const bd = new Date(u.birthdate);
      const bdDay = bd.getUTCDate();
      const bdMonth = bd.getUTCMonth();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() + i);
        if (d.getUTCDate() === bdDay && d.getUTCMonth() === bdMonth) {
          out.push({ id: u.id, username: u.username, displayName: u.displayName, day: bdDay, month: bdMonth + 1, inDays: i });
          break;
        }
      }
    }
    return out.sort((a, b) => a.inDays - b.inDays).slice(0, 20);
  } catch {
    return [];
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    // Shop is in India: bucket "today" and weekly stats by IST (Asia/Kolkata,
    // fixed UTC+5:30, no DST), not UTC - otherwise "today" splits at 5:30am IST.
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIstWall = new Date(Date.now() + IST_OFFSET_MS);
    const istMidnightUtc = (daysBack: number) =>
      new Date(
        Date.UTC(
          nowIstWall.getUTCFullYear(),
          nowIstWall.getUTCMonth(),
          nowIstWall.getUTCDate() - daysBack
        ) - IST_OFFSET_MS
      );
    const todayStart = istMidnightUtc(0);
    const [
      todayCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      userCount,
      rewardsAvailable,
      rewardsRedeemed,
    ] = await Promise.all([
      prisma.purchase.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.purchase.count({ where: { status: "PENDING" } }),
      prisma.purchase.count({ where: { status: "APPROVED" } }),
      prisma.purchase.count({ where: { status: "REJECTED" } }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.reward.count({ where: { status: { in: ["AVAILABLE", "CLAIMED"] } } }),
      prisma.reward.count({ where: { status: "REDEEMED" } }),
    ]);
    const recentPending = await prisma.purchase.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: { user: { select: { username: true, displayName: true } } },
    });
    // Last 7 days summary (bucketed in JS - zero extra deps).
    // Day boundaries use IST so counts match the shop's calendar day.
    const weekAgo = istMidnightUtc(6);
    const [weekPurchases, weekRewards] = await Promise.all([
      prisma.purchase.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { createdAt: true, status: true, amount: true },
        take: 2000,
      }),
      prisma.reward.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { createdAt: true },
        take: 2000,
      }),
    ]);
    const weekly: Array<{ date: string; label: string; approved: number; pending: number; rejected: number; revenue: number; rewards: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = istMidnightUtc(i);
      const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const dayP = weekPurchases.filter((p) => p.createdAt >= d && p.createdAt < next);
      // Calendar date as seen in IST (d itself is IST-midnight in UTC terms).
      const istWall = new Date(d.getTime() + IST_OFFSET_MS);
      const dateStr = istWall.toISOString().slice(0, 10);
      weekly.push({
        date: dateStr,
        label: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }),
        approved: dayP.filter((p) => p.status === "APPROVED").length,
        pending: dayP.filter((p) => p.status === "PENDING").length,
        rejected: dayP.filter((p) => p.status === "REJECTED").length,
        revenue: dayP.filter((p) => p.status === "APPROVED").reduce((s, p) => s + p.amount, 0),
        rewards: weekRewards.filter((r) => r.createdAt >= d && r.createdAt < next).length,
      });
    }
    return Response.json({
      stats: {
        todayPurchases: todayCount,
        pendingRequests: pendingCount,
        approvedPurchases: approvedCount,
        rejectedPurchases: rejectedCount,
        activeUsers: userCount,
        rewardsAvailable,
        rewardsRedeemed,
        weekRevenue: weekly.reduce((s, w) => s + w.revenue, 0),
        weekApproved: weekly.reduce((s, w) => s + w.approved, 0),
      },
      recentPending,
      weekly,
      birthdays: await upcomingBirthdays(),
    });
  } catch (e) {
    console.error("admin dashboard error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
