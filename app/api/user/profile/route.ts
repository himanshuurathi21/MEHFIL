import prisma from "@/lib/db";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { hashToken } from "@/lib/tokens";
import { passwordSchema } from "@/lib/validation";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(50).optional(),
  // YYYY-MM-DD, optional; year is kept but only day/month is used for reminders.
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
    .optional()
    .nullable(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
});

function parseBirthdate(value: string): { date?: Date; error?: string } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { error: "Invalid date. Use YYYY-MM-DD." };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: "Invalid date." };
  }
  // Construct in UTC and verify round-trip so impossible dates
  // (e.g. Feb 30, which JS would roll over to Mar 2) are rejected.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return { error: "Invalid date." };
  }
  if (d > new Date()) {
    return { error: "Birthday cannot be in the future." };
  }
  return { date: d };
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));

    // Email (username) can never be changed from here.
    if (body.email !== undefined || body.username !== undefined) {
      return Response.json({ error: "Email cannot be changed." }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }
    const { displayName, birthdate, currentPassword, newPassword } = parsed.data;

    if (
      displayName === undefined &&
      birthdate === undefined &&
      newPassword === undefined
    ) {
      return Response.json({ error: "Nothing to update." }, { status: 400 });
    }

    // Password change requires the current password.
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return Response.json(
          { error: "Current password is required to set a new password." },
          { status: 400 }
        );
      }
      const row = await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { passwordHash: true },
      });
      if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
        return Response.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    const data: { displayName?: string; birthdate?: Date | null; passwordHash?: string } = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (birthdate !== undefined) {
      if (birthdate === null || birthdate === "") {
        data.birthdate = null;
      } else {
        const r = parseBirthdate(birthdate);
        if (r.error || !r.date) {
          return Response.json({ error: r.error ?? "Invalid date." }, { status: 400 });
        }
        data.birthdate = r.date;
      }
    }
    if (newPassword !== undefined) {
      data.passwordHash = await hashPassword(newPassword);
      // Log out other devices/sessions, but keep the current one alive.
      const store = await cookies();
      const current = store.get(SESSION_COOKIE)?.value;
      await prisma.session.deleteMany({
        where: current
          ? { userId: auth.user.id, tokenHash: { not: hashToken(current) } }
          : { userId: auth.user.id },
      });
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data,
      select: { displayName: true, birthdate: true },
    });
    return Response.json({
      ok: true,
      displayName: updated.displayName,
      birthdate: updated.birthdate?.toISOString() ?? null,
      passwordChanged: newPassword !== undefined,
    });
  } catch (e) {
    console.error("profile update error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
