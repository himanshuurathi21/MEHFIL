import prisma from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const pWhere: { userId: string; status?: "PENDING" | "APPROVED" | "REJECTED" } = { userId: auth.user.id };
    if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
      pWhere.status = status;
    }
    const [purchases, rewards] = await Promise.all([
      prisma.purchase.findMany({
        where: pWhere,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.reward.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return Response.json({ purchases, rewards });
  } catch (e) {
    console.error("activity error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
