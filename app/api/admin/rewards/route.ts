import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where: { status?: "AVAILABLE" | "CLAIMED" | "REDEEMED" | "CANCELLED" } = {};
    if (status === "AVAILABLE" || status === "CLAIMED" || status === "REDEEMED" || status === "CANCELLED") {
      where.status = status;
    }
    const rewards = await prisma.reward.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { username: true, displayName: true } } },
    });
    return Response.json({ rewards });
  } catch (e) {
    console.error("admin rewards error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
