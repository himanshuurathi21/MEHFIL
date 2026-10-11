import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const pending = await prisma.purchase.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: { select: { username: true, displayName: true } } },
    });
    return Response.json({ purchases: pending });
  } catch (e) {
    console.error("pending error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
