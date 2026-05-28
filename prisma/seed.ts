import { PrismaClient, PrizeType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@luckyspin.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@luckyspin.com",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
    },
  });

  // Create demo user
  const demoPassword = await bcrypt.hash("demo123", 12);
  await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      passwordHash: demoPassword,
      firstName: "Demo",
      lastName: "User",
      phone: "1234567890",
      balance: 100,
      totalSpins: 0,
      totalWins: 0,
    },
  });

  // Create default spin condition
  await prisma.spinCondition.upsert({
    where: { id: "default-condition" },
    update: {},
    create: {
      id: "default-condition",
      name: "Default Spin Rules",
      maxSpinsPerDay: 10,
      minBalanceRequired: 0,
      zeroBalanceCanSpin: true,
      freeSpinEnabled: true,
      isActive: true,
    },
  });

  // Create default campaign setting
  await prisma.campaignSetting.upsert({
    where: { name: "default" },
    update: {},
    create: {
      name: "default",
      title: "Lucky Spin",
      subtitle: "Spin to win amazing prizes!",
      isActive: true,
      themeColor: "#FFD700",
    },
  });

  // Create prizes
  const prizes = [
    {
      name: "$5 Cash",
      description: "Win $5 real cash!",
      color: "#22c55e",
      value: 5,
      type: PrizeType.MONEY,
      stock: 100,
      probability: 15,
      isActive: true,
    },
    {
      name: "$2 Cash",
      description: "Win $2 real cash!",
      color: "#3b82f6",
      value: 2,
      type: PrizeType.MONEY,
      stock: 200,
      probability: 25,
      isActive: true,
    },
    {
      name: "$1 Cash",
      description: "Win $1 real cash!",
      color: "#eab308",
      value: 1,
      type: PrizeType.MONEY,
      stock: 500,
      probability: 30,
      isActive: true,
    },
    {
      name: "Free Spin",
      description: "Get another spin for free!",
      color: "#a855f7",
      value: 0,
      type: PrizeType.FREE_SPIN,
      stock: 50,
      probability: 10,
      isActive: true,
    },
    {
      name: "50% Off Coupon",
      description: "50% off your next purchase",
      color: "#ec4899",
      value: 0,
      type: PrizeType.COUPON,
      stock: 75,
      probability: 10,
      isActive: true,
    },
    {
      name: "Mystery Box",
      description: "A surprise gift",
      color: "#f97316",
      value: 0,
      type: PrizeType.PRODUCT,
      stock: 30,
      probability: 5,
      isActive: true,
    },
    {
      name: "Better Luck Next Time",
      description: "No prize this time",
      color: "#6b7280",
      value: 0,
      type: PrizeType.EMPTY,
      stock: 0,
      probability: 5,
      isActive: true,
    },
  ];

  for (const prize of prizes) {
    await prisma.prize.upsert({
      where: { id: prize.name.toLowerCase().replace(/\s+/g, "-") },
      update: prize,
      create: {
        id: prize.name.toLowerCase().replace(/\s+/g, "-"),
        ...prize,
      },
    });
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });