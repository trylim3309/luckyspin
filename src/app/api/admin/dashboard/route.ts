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
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    const { searchParams } = req.nextUrl;
    const team = searchParams.get("team");
    const isRestricted = session.role === "AGENT" || session.role === "TEAM_LEADER";
    const userTeams = session.teams || ["KING88"];

    // Deposit condition: accountId exists AND result = DEPOSIT (matching New Customers stats)
    const depositCondition = {
      accountId: { not: null },
      result: "DEPOSIT" as const,
    };

    // Filter by team if specified
    const teamFilter = team && team !== "all" ? [team as string] : null;

    // Find all agents who share at least one team with current user
    const teamAgentsWhere = isRestricted
      ? { teams: { hasSome: userTeams } }
      : teamFilter
        ? { teams: { hasSome: teamFilter } }
        : {};
    const teamAgents = await prisma.adminUser.findMany({
      where: teamAgentsWhere,
      select: { id: true, name: true, fullName: true, role: true, teams: true },
    });

    const teamAgentIds = teamAgents.map(a => a.id);
    const agentMap = new Map(teamAgents.map(a => [a.id, a]));

    // Get customer counts by agent (filtered by team and deposit condition)
    const customerStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { agentId: { in: teamAgentIds }, ...depositCondition },
      _count: true,
    });

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

    // Team totals (based on user's teams and deposit condition)
    const teamTotals = await prisma.customer.groupBy({
      by: ["team"],
      where: { agentId: { in: teamAgentIds }, ...depositCondition },
      _count: true,
    });

    const teamStatsMap: Record<string, number> = { KING88: 0, SKY24: 0, B88: 0 };
    for (const t of teamTotals) {
      teamStatsMap[t.team] = t._count;
    }

    // Grand total (based on user's teams and deposit condition)
    const totalCustomers = await prisma.customer.count({ where: { agentId: { in: teamAgentIds }, ...depositCondition } });

    // Today's new customers (based on user's teams and deposit condition)
    const todayCustomers = await prisma.customer.count({
      where: { agentId: { in: teamAgentIds }, ...depositCondition, createdAt: { gte: today } },
    });

    // This week's new customers (based on user's teams and deposit condition)
    const weekCustomers = await prisma.customer.count({
      where: { agentId: { in: teamAgentIds }, ...depositCondition, createdAt: { gte: weekStart } },
    });

    // This month's new customers (based on user's teams and deposit condition)
    const monthCustomers = await prisma.customer.count({
      where: { agentId: { in: teamAgentIds }, ...depositCondition, createdAt: { gte: monthStart } },
    });

    // Last month's new customers (based on user's teams and deposit condition)
    const lastMonthCustomers = await prisma.customer.count({
      where: { agentId: { in: teamAgentIds }, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    });

    return NextResponse.json({
      todayCustomers,
      weekCustomers,
      monthCustomers,
      lastMonthCustomers,
      teamStats: teamStatsMap,
      agentStats: agentCustomerStats,
      userTeams: userTeams,
      isRestricted: isRestricted,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
