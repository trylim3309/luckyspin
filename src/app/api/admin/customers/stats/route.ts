import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getAdminSession(req: NextRequest) {
  const adminSession = req.cookies.get("admin_session");
  if (!adminSession) return null;
  try {
    return JSON.parse(Buffer.from(adminSession.value, "base64").toString());
  } catch {
    return null;
  }
}

type Breakdown = {
  total: number;
  notCreated: number;
  notDeposit: number;
  deposit: number;
};

export async function GET(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const isAgent = session.role === "AGENT" || session.role === "TEAM_LEADER";

    // Filter for DEPOSIT (counted customers - those with accountId and result = DEPOSIT)
    const depositCondition = {
      accountId: { not: null },
      result: "DEPOSIT" as const,
    };

    // Helper to build breakdown
    const buildBreakdown = (total: number, notCreated: number, notDeposit: number, deposit: number): Breakdown => ({
      total,
      notCreated,
      notDeposit,
      deposit,
    });

    // Agents only see their own stats + team totals
    if (isAgent) {
      const [
        myLastMonth,
        myToday,
        myWeek,
        myMonth,
        teamLastMonth,
        // Today breakdown
        myTodayTotal,
        myTodayNotCreated,
        myTodayNotDeposit,
        myTodayDeposit,
        // Week breakdown
        myWeekTotal,
        myWeekNotCreated,
        myWeekNotDeposit,
        myWeekDeposit,
        // Month breakdown
        myMonthTotal,
        myMonthNotCreated,
        myMonthNotDeposit,
        myMonthDeposit,
        // Last month breakdown
        myLastMonthTotal,
        myLastMonthNotCreated,
        myLastMonthNotDeposit,
        myLastMonthDeposit,
      ] = await Promise.all([
        prisma.customer.count({ where: { agentId: session.id, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
        prisma.customer.count({ where: { agentId: session.id, ...depositCondition, createdAt: { gte: todayStart } } }),
        prisma.customer.count({ where: { agentId: session.id, ...depositCondition, createdAt: { gte: weekStart } } }),
        prisma.customer.count({ where: { agentId: session.id, ...depositCondition, createdAt: { gte: monthStart } } }),
        prisma.customer.count({ where: { team: session.team, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
        // Today breakdown by result
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: todayStart } } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: todayStart }, result: "NOT_CREATED" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: todayStart }, result: "NOT_DEPOSIT" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: todayStart }, result: "DEPOSIT" } }),
        // Week breakdown by result
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: weekStart } } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: weekStart }, result: "NOT_CREATED" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: weekStart }, result: "DEPOSIT" } }),
        // Month breakdown by result
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: monthStart } } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: monthStart }, result: "NOT_CREATED" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: monthStart }, result: "DEPOSIT" } }),
        // Last month breakdown by result
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_CREATED" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" } }),
        prisma.customer.count({ where: { agentId: session.id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" } }),
      ]);

      const myStats = {
        today: myToday,
        week: myWeek,
        month: myMonth,
        all: myLastMonth,
        todayBreakdown: buildBreakdown(myTodayTotal, myTodayNotCreated, myTodayNotDeposit, myTodayDeposit),
        weekBreakdown: buildBreakdown(myWeekTotal, myWeekNotCreated, myWeekNotDeposit, myWeekDeposit),
        monthBreakdown: buildBreakdown(myMonthTotal, myMonthNotCreated, myMonthNotDeposit, myMonthDeposit),
        allBreakdown: buildBreakdown(myLastMonthTotal, myLastMonthNotCreated, myLastMonthNotDeposit, myLastMonthDeposit),
      };
      const teamStats = { [session.team]: teamLastMonth };

      return NextResponse.json({
        agents: [{ id: session.id, name: session.name, fullName: session.fullName, role: session.role, stats: myStats }],
        teams: teamStats,
      });
    }

    // Admin sees all stats - use efficient count queries
    const allAgents = await prisma.adminUser.findMany({
      select: { id: true, name: true, fullName: true, role: true },
      orderBy: { name: "asc" },
    });

    // Get date-filtered counts for DEPOSIT
    const lastMonthStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _count: true,
    });

    const todayStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { ...depositCondition, createdAt: { gte: todayStart } },
      _count: true,
    });

    const weekStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { ...depositCondition, createdAt: { gte: weekStart } },
      _count: true,
    });

    const monthStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { ...depositCondition, createdAt: { gte: monthStart } },
      _count: true,
    });

    // Today breakdown by result
    const todayTotalStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: todayStart } },
      _count: true,
    });

    const todayNotCreatedStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: todayStart }, result: "NOT_CREATED" },
      _count: true,
    });

    const todayNotDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: todayStart }, result: "NOT_DEPOSIT" },
      _count: true,
    });

    const todayDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: todayStart }, result: "DEPOSIT" },
      _count: true,
    });

    // Week breakdown by result
    const weekTotalStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: weekStart } },
      _count: true,
    });

    const weekNotCreatedStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: weekStart }, result: "NOT_CREATED" },
      _count: true,
    });

    const weekNotDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" },
      _count: true,
    });

    const weekDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: weekStart }, result: "DEPOSIT" },
      _count: true,
    });

    // Month breakdown by result
    const monthTotalStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: monthStart } },
      _count: true,
    });

    const monthNotCreatedStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: monthStart }, result: "NOT_CREATED" },
      _count: true,
    });

    const monthNotDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" },
      _count: true,
    });

    const monthDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: monthStart }, result: "DEPOSIT" },
      _count: true,
    });

    // Last month breakdown by result
    const lastMonthTotalStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _count: true,
    });

    const lastMonthNotCreatedStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_CREATED" },
      _count: true,
    });

    const lastMonthNotDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" },
      _count: true,
    });

    const lastMonthDepositStats = await prisma.customer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" },
      _count: true,
    });

    // Team totals
    const teamLastMonth = await prisma.customer.groupBy({
      by: ["team"],
      where: { ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _count: true,
    });

    // Build stats map
    const buildStatsMap = (stats: any[]) => {
      const map: Record<string, number> = {};
      for (const s of stats) {
        map[s.agentId] = s._count;
      }
      return map;
    };

    const lastMonthMap = buildStatsMap(lastMonthStats);
    const todayMap = buildStatsMap(todayStats);
    const weekMap = buildStatsMap(weekStats);
    const monthMap = buildStatsMap(monthStats);
    const todayTotalMap = buildStatsMap(todayTotalStats);
    const todayNotCreatedMap = buildStatsMap(todayNotCreatedStats);
    const todayNotDepositMap = buildStatsMap(todayNotDepositStats);
    const todayDepositMap = buildStatsMap(todayDepositStats);
    const weekTotalMap = buildStatsMap(weekTotalStats);
    const weekNotCreatedMap = buildStatsMap(weekNotCreatedStats);
    const weekNotDepositMap = buildStatsMap(weekNotDepositStats);
    const weekDepositMap = buildStatsMap(weekDepositStats);
    const monthTotalMap = buildStatsMap(monthTotalStats);
    const monthNotCreatedMap = buildStatsMap(monthNotCreatedStats);
    const monthNotDepositMap = buildStatsMap(monthNotDepositStats);
    const monthDepositMap = buildStatsMap(monthDepositStats);
    const lastMonthTotalMap = buildStatsMap(lastMonthTotalStats);
    const lastMonthNotCreatedMap = buildStatsMap(lastMonthNotCreatedStats);
    const lastMonthNotDepositMap = buildStatsMap(lastMonthNotDepositStats);
    const lastMonthDepositMap = buildStatsMap(lastMonthDepositStats);

    const teamStatsMap: Record<string, number> = { KING88: 0, SKY24: 0, B88: 0 };
    for (const s of teamLastMonth) {
      teamStatsMap[s.team] = s._count;
    }

    const agentStats = allAgents.map(a => ({
      id: a.id,
      name: a.name,
      fullName: a.fullName,
      role: a.role,
      stats: {
        today: todayMap[a.id] || 0,
        week: weekMap[a.id] || 0,
        month: monthMap[a.id] || 0,
        all: lastMonthMap[a.id] || 0,
        todayBreakdown: buildBreakdown(
          todayTotalMap[a.id] || 0,
          todayNotCreatedMap[a.id] || 0,
          todayNotDepositMap[a.id] || 0,
          todayDepositMap[a.id] || 0
        ),
        weekBreakdown: buildBreakdown(
          weekTotalMap[a.id] || 0,
          weekNotCreatedMap[a.id] || 0,
          weekNotDepositMap[a.id] || 0,
          weekDepositMap[a.id] || 0
        ),
        monthBreakdown: buildBreakdown(
          monthTotalMap[a.id] || 0,
          monthNotCreatedMap[a.id] || 0,
          monthNotDepositMap[a.id] || 0,
          monthDepositMap[a.id] || 0
        ),
        allBreakdown: buildBreakdown(
          lastMonthTotalMap[a.id] || 0,
          lastMonthNotCreatedMap[a.id] || 0,
          lastMonthNotDepositMap[a.id] || 0,
          lastMonthDepositMap[a.id] || 0
        ),
      },
    }));

    // Sort by today's count descending
    agentStats.sort((a, b) => b.stats.today - a.stats.today);

    return NextResponse.json({ agents: agentStats, teams: teamStatsMap });
  } catch (error) {
    console.error("Customers stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
