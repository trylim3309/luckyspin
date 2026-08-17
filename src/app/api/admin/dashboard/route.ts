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

    // Build date filters using Cambodia timezone (UTC+7)
    const now = new Date();
    const utcDateStr = now.toISOString().slice(0, 10);
    const [utcYear, utcMonth, utcDay] = utcDateStr.split("-").map(Number);

    let cambodiaYear = utcYear;
    let cambodiaMonth = utcMonth;
    let cambodiaDay = utcDay;
    const utcHour = parseInt(now.toISOString().slice(11, 13), 10);
    if (utcHour + 7 >= 24) {
      cambodiaDay++;
      const daysInMonth = new Date(Date.UTC(cambodiaYear, cambodiaMonth, 0)).getDate();
      if (cambodiaDay > daysInMonth) {
        cambodiaDay = 1;
        cambodiaMonth++;
        if (cambodiaMonth > 12) {
          cambodiaMonth = 1;
          cambodiaYear++;
        }
      }
    }

    const today = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay, 0, 0, 0));

    // This week = start of current week in Cambodia timezone (Monday 00:00 ICT = Sunday 17:00 UTC)
    let cambodiaDateWeek = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const cmYearWeek = cambodiaDateWeek.getUTCFullYear();
    const cmMonthWeek = cambodiaDateWeek.getUTCMonth();
    const cmDayWeek = cambodiaDateWeek.getUTCDate();
    const cmDayOfWeek = cambodiaDateWeek.getUTCDay(); // 0 = Sunday
    // Go back to Monday (if Sunday, go back 6 days; otherwise go back cmDayOfWeek days to get to previous Sunday 17:00 UTC)
    const daysToMonday = cmDayOfWeek === 0 ? 6 : cmDayOfWeek;
    const weekStart = new Date(Date.UTC(cmYearWeek, cmMonthWeek, cmDayWeek - daysToMonday, 17, 0, 0, 0));

    // This month = 1st of month 17:00 UTC (same calculation as customers API)
    let cambodiaDateMonth = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const cmYear = cambodiaDateMonth.getUTCFullYear();
    const cmMonth = cambodiaDateMonth.getUTCMonth();
    const monthStart = new Date(Date.UTC(cmYear, cmMonth, 1, 17, 0, 0, 0) - 24 * 60 * 60 * 1000);

    // Last month = 1st of last month 17:00 UTC to last day of last month 16:59:59 UTC
    let lmMonth = cmMonth;
    let lmYear = cmYear;
    if (lmMonth < 1) {
      lmMonth = 12;
      lmYear--;
    }
    const lastMonthStart = new Date(Date.UTC(lmYear, lmMonth - 1, 1, 17, 0, 0));
    const lastDayOfLastMonth = new Date(Date.UTC(lmYear, lmMonth, 0)).getUTCDate();
    const lastMonthEnd = new Date(Date.UTC(lmYear, lmMonth - 1, lastDayOfLastMonth, 16, 59, 59, 999));

    const { searchParams } = req.nextUrl;
    const team = searchParams.get("team");
    const isRestricted = session.role === "AGENT" || session.role === "TEAM_LEADER";
    const canViewAllTeams = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.role);
    const userTeams = session.teams || ["KING88"];

    // Deposit condition: accountId exists AND result = DEPOSIT (matching New Customers stats)
    const depositCondition = { accountId: { not: null }, result: "DEPOSIT" as const };

    // Filter by team if specified
    const teamFilter = team && team !== "all" ? [team as string] : null;

    // Find all agents who share at least one team with current user (for restricted users)
    // Admins/managers can see all teams and agents
    let teamAgentsWhere: any = {};
    if (isRestricted) {
      teamAgentsWhere = { teams: { hasSome: userTeams } };
    } else if (teamFilter) {
      teamAgentsWhere = { teams: { hasSome: teamFilter } };
    }
    const teamAgents = await prisma.adminUser.findMany({
      where: teamAgentsWhere,
      select: { id: true, name: true, fullName: true, role: true, teams: true },
    });

    const teamAgentIds = teamAgents.map(a => a.id);
    const agentMap = new Map(teamAgents.map(a => [a.id, a]));

    // Base condition: filter by team agents and deposit (same as New Customers)
    const baseCondition = { agentId: { in: teamAgentIds }, ...depositCondition, createdAt: { gte: monthStart } };

    // Get customer counts by agent (with deposit condition - this month)
    const customerStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: baseCondition,
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

    // Team totals (with deposit condition - this month)
    const teamTotals = await prisma.customer.groupBy({
      by: ["team"],
      where: baseCondition,
      _count: true,
    });

    const teamStatsMap: Record<string, number> = { KING88: 0, SKY24: 0, B88: 0 };
    for (const t of teamTotals) {
      teamStatsMap[t.team] = t._count;
    }

    // Grand total (with deposit condition - this month)
    const totalCustomers = await prisma.customer.count({ where: baseCondition });

    // Today's new customers (with deposit condition)
    const todayCustomers = await prisma.customer.count({
      where: { agentId: { in: teamAgentIds }, ...depositCondition, createdAt: { gte: today } },
    });

    // This week's new customers (with deposit condition)
    const weekCustomers = await prisma.customer.count({
      where: { agentId: { in: teamAgentIds }, ...depositCondition, createdAt: { gte: weekStart } },
    });

    // This month's new customers (with deposit condition)
    const monthCustomers = await prisma.customer.count({
      where: baseCondition,
    });

    // Last month's new customers (with deposit condition)
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
      canViewAllTeams: canViewAllTeams,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
