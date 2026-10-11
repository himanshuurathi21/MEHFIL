import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Development seed ONLY. Never run against production with these credentials.
 * Creates: 1 admin + 2 demo users + starter loyalty progress.
 */
async function main() {
  const adminHash = await bcrypt.hash("MehfilAdmin123!", 12);
  const admin = await prisma.user.upsert({
    where: { username: "mehfil" },
    create: {
      username: "mehfil",
      passwordHash: adminHash,
      displayName: "Mehfil",
      role: "ADMIN",
    },
    update: { role: "ADMIN" },
  });
  await prisma.loyaltyProgress.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id },
    update: {},
  });

  for (const [username, displayName] of [
    ["himanshu@example.com", "Himanshu"],
    ["rahul@example.com", "Rahul"],
  ] as const) {
    const hash = await bcrypt.hash("DemoUser123!", 12);
    const u = await prisma.user.upsert({
      where: { username },
      create: { username, passwordHash: hash, displayName, role: "USER" },
      update: {},
    });
    await prisma.loyaltyProgress.upsert({
      where: { userId: u.id },
      create: { userId: u.id, chaiCount: 5, maggieCount: 6, eligibleVisitCount: 3 },
      update: {},
    });
    console.log(`Seeded demo user ${username} / DemoUser123!`);
  }
  console.log("Seed complete. Demo admin: mehfil / MehfilAdmin123! (DEV ONLY)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
