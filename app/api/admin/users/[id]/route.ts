import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        birthdate: true,
        createdAt: true,
        loyaltyProgress: true,
        purchases: { orderBy: { createdAt: "desc" }, take: 100 },
        rewards: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });
    return Response.json({ user });
  } catch (e) {
    console.error("admin user detail error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
