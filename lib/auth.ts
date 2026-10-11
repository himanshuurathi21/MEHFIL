import { cookies } from "next/headers";
import prisma from "./db";
import { hashToken, generateSessionToken } from "./tokens";

export const SESSION_COOKIE = "mehfil_session";
const SESSION_DAYS = 30;

export type SafeUser = {
  id: string;
  username: string;
  displayName: string;
  role: "USER" | "ADMIN";
  createdAt: Date;
};

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });
  return token;
}

export async function destroySessionByToken(token: string): Promise<void> {
  try {
    await prisma.session.delete({ where: { tokenHash: hashToken(token) } });
  } catch {
    // already gone
  }
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role as "USER" | "ADMIN",
    createdAt: session.user.createdAt,
  };
}

export async function requireUser(): Promise<
  { user: SafeUser } | { response: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: Response.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: SafeUser } | { response: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: Response.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }
  if (user.role !== "ADMIN") {
    return {
      response: Response.json({ error: "Admin access required." }, { status: 403 }),
    };
  }
  return { user };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
