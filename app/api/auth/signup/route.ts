import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword, normalizeUsername } from "@/lib/password";
import { signupSchema } from "@/lib/validation";
import { createSession, SESSION_COOKIE, sessionCookieOptions, getClientIp } from "@/lib/auth";
import { checkRateLimit, signupRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(signupRateLimitKey(getClientIp(req)), 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many accounts created. Please try again later." },
        { status: 429 }
      );
    }
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }
    const username = normalizeUsername(parsed.data.username);
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "This email is already registered. Please login." },
        { status: 409 }
      );
    }
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          passwordHash,
          displayName: parsed.data.displayName.trim(),
          role: "USER",
        },
      });
      await tx.loyaltyProgress.create({ data: { userId: created.id } });
      return created;
    });
    const token = await createSession(user.id);
    const res = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      },
      { status: 201 }
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(30 * 24 * 60 * 60));
    return res;
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
