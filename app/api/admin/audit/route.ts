import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const actions = await prisma.adminAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { admin: { select: { username: true, displayName: true } } },
    });
    return Response.json({ actions });
  } catch (e) {
    console.error("audit error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
