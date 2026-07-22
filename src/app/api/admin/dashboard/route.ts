import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const adminSession = req.cookies.get("admin_session");
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(Buffer.from(adminSession.value, "base64").toString());
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Allow all authenticated admin roles to access dashboard
    if (!session || !session.id || !session.type) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get customer counts by agent
    const customerStats = await prisma.customer.groupBy({
      by: ["agentId"],
      _count: true,
    });

    // Get agent details
    const agents = await prisma.adminUser.findMany({
      select: { id: true, name: true, fullName: true, role: true, teams: true },
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));

    // Build agent customer list with counts
    const agentCustomerStats = customerStats.map(stat => {
      const agent = agentMap.get(stat.agentId);
      return {
        id: stat.agentId,
        name: agent?.fullName || agent?.name || "Unknown",
        role: agent?.role || "AGENT",
        teams: agent?.teams || ["KING88"],
        totalCustomers: stat._count,
      };
    });

    // Sort by total customers descending
    agentCustomerStats.sort((a, b) => b.totalCustomers - a.totalCustomers);

    // Team totals
    const teamTotals = await prisma.customer.groupBy({
      by: ["team"],
      _count: true,
    });

    const teamStatsMap: Record<string, number> = { KING88: 0, SKY24: 0, B88: 0 };
    for (const t of teamTotals) {
      teamStatsMap[t.team] = t._count;
    }

    // Grand total
    const totalCustomers = await prisma.customer.count();

    // Today's new customers
    const todayCustomers = await prisma.customer.count({
      where: { createdAt: { gte: today } },
    });

    // This week's new customers
    const weekCustomers = await prisma.customer.count({
      where: { createdAt: { gte: weekStart } },
    });

    // This month's new customers
    const monthCustomers = await prisma.customer.count({
      where: { createdAt: { gte: monthStart } },
    });

    return NextResponse.json({
      totalCustomers,
      todayCustomers,
      weekCustomers,
      monthCustomers,
      teamStats: teamStatsMap,
      agentStats: agentCustomerStats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
