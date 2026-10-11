import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const rawTake = parseInt(url.searchParams.get("take") ?? "50", 10);
    const take = Number.isFinite(rawTake)
      ? Math.max(1, Math.min(rawTake || 50, 100))
      : 50;
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        loyaltyProgress: true,
        _count: { select: { purchases: true, rewards: true } },
      },
    });
    // Attach reward counts per type for quick glance
    return Response.json({ users });
  } catch (e) {
    console.error("admin users error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
