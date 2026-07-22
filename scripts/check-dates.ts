import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check recent customers with their createdAt
  const customers = await prisma.customer.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, team: true, createdAt: true, agentId: true }
  });

  console.log("Recent customers (UTC):");
  customers.forEach(c => {
    console.log(`${c.name} | Team: ${c.team} | createdAt: ${c.createdAt.toISOString()} | local: ${c.createdAt.toLocaleString()}`);
  });

  // Check yesterday range
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  console.log(`\nYesterday (local midnight): ${yesterday.toISOString()}`);
  console.log(`Today (local midnight): ${tomorrow.toISOString()}`);

  const yesterdayCustomers = await prisma.customer.findMany({
    where: {
      createdAt: {
        gte: yesterday,
        lt: tomorrow
      }
    },
    select: { id: true, name: true, team: true, createdAt: true }
  });

  console.log(`\nCustomers created between yesterday midnight and today midnight (${yesterdayCustomers.length}):`);
  yesterdayCustomers.forEach(c => {
    console.log(`${c.name} | Team: ${c.team} | createdAt: ${c.createdAt.toISOString()}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
