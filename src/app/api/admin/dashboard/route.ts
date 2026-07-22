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

    if (!session || !session.id || !session.type) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Role-based filtering: AGENT and TEAM_LEADER only see their own customers
    const isRestricted = session.role === "AGENT" || session.role === "TEAM_LEADER";
    const whereClause = isRestricted ? { agentId: session.id } : {};

    // Get customer counts by agent (filtered by role)
    const customerStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: whereClause,
      _count: true,
    });

    // Get agent details - restricted roles only see their own
    const agentFilter = isRestricted ? { where: { id: session.id } } : {};
    const agents = await prisma.adminUser.findMany({
      where: agentFilter.where,
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

    // Team totals (filtered by role)
    const teamTotals = await prisma.customer.groupBy({
      by: ["team"],
      where: whereClause,
      _count: true,
    });

    const teamStatsMap: Record<string, number> = { KING88: 0, SKY24: 0, B88: 0 };
    for (const t of teamTotals) {
      teamStatsMap[t.team] = t._count;
    }

    // Grand total (filtered by role)
    const totalCustomers = await prisma.customer.count({ where: whereClause });

    // Today's new customers (filtered by role)
    const todayCustomers = await prisma.customer.count({
      where: { ...whereClause, createdAt: { gte: today } },
    });

    // This week's new customers (filtered by role)
    const weekCustomers = await prisma.customer.count({
      where: { ...whereClause, createdAt: { gte: weekStart } },
    });

    // This month's new customers (filtered by role)
    const monthCustomers = await prisma.customer.count({
      where: { ...whereClause, createdAt: { gte: monthStart } },
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
