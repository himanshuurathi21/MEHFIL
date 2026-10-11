import prisma from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const rewards = await prisma.reward.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ rewards });
  } catch (e) {
    console.error("rewards error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
