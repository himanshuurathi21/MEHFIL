/**
 * Secure first-admin setup.
 * Usage:
 *   ADMIN_USERNAME=... ADMIN_PASSWORD=... ADMIN_SETUP_SECRET_INPUT=... npm run create-admin
 *   npm run create-admin -- --secret <ADMIN_SETUP_SECRET>
 * Or interactive:
 *   npm run create-admin
 *
 * Requires DATABASE_URL to be set. Never hardcodes credentials.
 * When ADMIN_SETUP_SECRET is set, you must confirm it via
 * ADMIN_SETUP_SECRET_INPUT env or the --secret flag (or an interactive prompt).
 */
import readline from "readline";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function ask(q: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(q, (a) => {
        rl.close();
        resolve(a.trim());
      });
    } else {
      // Simple hidden input is platform-dependent; fall back to visible with warning.
      rl.question(q, (a) => {
        rl.close();
        resolve(a.trim());
      });
    }
  });
}

async function main() {
  const requiredSecret = process.env.ADMIN_SETUP_SECRET;
  if (requiredSecret) {
    const provided =
      process.env.ADMIN_SETUP_SECRET_INPUT ??
      (process.argv.includes("--secret")
        ? process.argv[process.argv.indexOf("--secret") + 1]
        : undefined);
    // If ADMIN_SETUP_SECRET is set, require confirmation via env or prompt.
    const input = provided ?? (await ask("Enter ADMIN_SETUP_SECRET: ", true));
    if (input !== requiredSecret) {
      console.error("Invalid setup secret. Aborting.");
      process.exit(1);
    }
  }

  let username = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD ?? "";
  let displayName = (process.env.ADMIN_DISPLAY_NAME ?? "MEHFIL Admin").trim() || "MEHFIL Admin";

  if (!username) username = (await ask("Admin username: ")).toLowerCase();
  if (!displayName || displayName === "MEHFIL Admin") {
    const d = await ask("Admin display name [MEHFIL Admin]: ");
    if (d) displayName = d;
  }
  if (!password) password = await ask("Admin password (min 8 chars): ", true);

  if (username.length < 3) {
    console.error("Username must be at least 3 characters.");
    process.exit(1);
  }
  if (!/^[a-zA-Z0-9_.@-]+$/.test(username)) {
    console.error("Username may contain only letters, numbers, _, ., @ and -");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Admin password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: existing.id }, data: { role: "ADMIN", passwordHash } });
        await tx.loyaltyProgress.upsert({
          where: { userId: existing.id },
          create: { userId: existing.id },
          update: {},
        });
      });
      console.log(`Promoted existing user "${username}" to ADMIN and updated password.`);
    } else {
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
      console.log(`Updated password for admin "${username}".`);
    }
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { username, passwordHash, displayName, role: "ADMIN" },
    });
    await tx.loyaltyProgress.upsert({
      where: { userId: u.id },
      create: { userId: u.id },
      update: {},
    });
    return u;
  });
  console.log(`Admin "${created.username}" created successfully.`);
}

main()
  .catch((e) => {
    console.error("create-admin failed:", e?.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
