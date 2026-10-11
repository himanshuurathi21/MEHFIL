import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, normalizeUsername } from "@/lib/password";
import { loginSchema } from "@/lib/validation";
import { createSession, SESSION_COOKIE, sessionCookieOptions, getClientIp } from "@/lib/auth";
import { checkRateLimit, loginRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 400 });
    }
    const username = normalizeUsername(parsed.data.username);
    const ip = getClientIp(req);
    // Per-account guard (10 tries per user per 10 min) plus a stricter
    // per-IP guard so one IP can't spray many usernames.
    const rlIp = checkRateLimit(`login-ip:${ip}`, 30, 10 * 60 * 1000);
    if (!rlIp.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }
    const rl = checkRateLimit(loginRateLimitKey(ip, username), 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    const token = await createSession(user.id);
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(30 * 24 * 60 * 60));
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
