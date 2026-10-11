import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ user: null }, { status: 200 });
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { birthdate: true },
    });
    return Response.json(
      { user: { ...user, birthdate: full?.birthdate?.toISOString() ?? null } },
      { status: 200 }
    );
  } catch (e) {
    console.error("me error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
