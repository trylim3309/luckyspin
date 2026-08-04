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

    const { searchParams } = req.nextUrl;
    const filterTeam = searchParams.get("team");
    const filterAgentId = searchParams.get("agentId");

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

    // Today = 17:00 UTC yesterday to 17:00 UTC today
    const today17UTC = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay, 17, 0, 0));
    const yesterday17UTC = new Date(today17UTC.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = yesterday17UTC;

    // This week = 1st of month 17:00 UTC (same as customers API)
    let cambodiaDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const cmYear = cambodiaDate.getUTCFullYear();
    const cmMonth = cambodiaDate.getUTCMonth();
    const weekStart = new Date(Date.UTC(cmYear, cmMonth, 1, 17, 0, 0, 0) - 24 * 60 * 60 * 1000);

    // This month = 1st of month 17:00 UTC to now (same calculation as customers API)
    let cambodiaDateMonth = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const cmYearMonth = cambodiaDateMonth.getUTCFullYear();
    const cmMonthMonth = cambodiaDateMonth.getUTCMonth();
    const monthStart = new Date(Date.UTC(cmYearMonth, cmMonthMonth, 1, 17, 0, 0, 0) - 24 * 60 * 60 * 1000);

    // Last month = 1st of last month 17:00 UTC to last day of last month 16:59:59 UTC
    let lmMonth = cmMonthMonth;
    let lmYear = cmYearMonth;
    if (lmMonth < 1) {
      lmMonth = 12;
      lmYear--;
    }
    const lastMonthStart = new Date(Date.UTC(lmYear, lmMonth - 1, 1, 17, 0, 0));
    const lastDayOfLastMonth = new Date(Date.UTC(lmYear, lmMonth, 0)).getUTCDate();
    const lastMonthEnd = new Date(Date.UTC(lmYear, lmMonth - 1, lastDayOfLastMonth, 16, 59, 59, 999));

    const isAgent = session.role === "AGENT" || session.role === "TEAM_LEADER";

    // Deposit condition: accountId exists AND result = DEPOSIT (matching New Customers stats)
    const depositCondition = { accountId: { not: null }, result: "DEPOSIT" as const };

    // Build base where clause based on filters
    const buildWhere = (extra: any = {}) => {
      const where: any = { ...extra };
      if (filterAgentId && filterAgentId !== "all") {
        where.agentId = filterAgentId;
      }
      if (filterTeam && filterTeam !== "all") {
        where.team = filterTeam;
      }
      return where;
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
      // Use filterTeam if set, otherwise use session.teams[0] or session.team
      const effectiveTeam = (filterTeam && filterTeam !== "all") ? filterTeam : (session.teams?.[0] || session.team);
      const [
        myLastMonth,
        myToday,
        myWeek,
        myMonth,
        teamLastMonth,
        myTodayTotal,
        myTodayNotCreated,
        myTodayNotDeposit,
        myTodayDeposit,
        myWeekTotal,
        myWeekNotCreated,
        myWeekNotDeposit,
        myWeekDeposit,
        myMonthTotal,
        myMonthNotCreated,
        myMonthNotDeposit,
        myMonthDeposit,
        myLastMonthTotal,
        myLastMonthNotCreated,
        myLastMonthNotDeposit,
        myLastMonthDeposit,
      ] = await Promise.all([
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, ...depositCondition, createdAt: { gte: todayStart } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, ...depositCondition, createdAt: { gte: weekStart } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, ...depositCondition, createdAt: { gte: monthStart } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: todayStart } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: todayStart }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: todayStart }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: todayStart }, result: "DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: weekStart } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: weekStart }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: weekStart }, result: "DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: monthStart } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: monthStart }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: monthStart }, result: "DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ team: effectiveTeam, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" }) }),
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
      console.log("isAgent path - filterTeam:", filterTeam, "session.team:", session.team, "effectiveTeam:", effectiveTeam, "myWeek:", myWeek);
      const teamStats = { [effectiveTeam]: teamLastMonth };

      return NextResponse.json({
        agents: [{ id: session.id, name: session.name, fullName: session.fullName, role: session.role, stats: myStats }],
        teams: teamStats,
      });
    }

    // Admin sees all stats
    const agentWhere: any = {};
    if (filterTeam && filterTeam !== "all") {
      agentWhere.teams = { has: filterTeam };
    }

    const allAgents = await prisma.adminUser.findMany({
      where: agentWhere,
      select: { id: true, name: true, fullName: true, role: true },
      orderBy: { name: "asc" },
    });

    const agentIds = allAgents.map(a => a.id);

    // If filtering by specific agent, only return that agent's stats
    if (filterAgentId && filterAgentId !== "all") {
      const agent = allAgents.find(a => a.id === filterAgentId);
      if (!agent) {
        return NextResponse.json({ agents: [], teams: { KING88: 0, SKY24: 0, B88: 0 } });
      }

      const [todayCount, weekCount, monthCount, lastMonthCount,
        todayTotal, todayNotCreated, todayNotDeposit, todayDeposit,
        weekTotal, weekNotCreated, weekNotDeposit, weekDeposit,
        monthTotal, monthNotCreated, monthNotDeposit, monthDeposit,
        lastMonthTotal, lastMonthNotCreated, lastMonthNotDeposit, lastMonthDeposit] = await Promise.all([
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: todayStart } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: weekStart } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: monthStart } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: todayStart } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: todayStart }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: todayStart }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: todayStart }, result: "DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart }, result: "DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart }, result: "DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_CREATED" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" }) }),
        prisma.customer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" }) }),
      ]);

      return NextResponse.json({
        agents: [{
          id: agent.id,
          name: agent.name,
          fullName: agent.fullName,
          role: agent.role,
          stats: {
            today: todayCount,
            week: weekCount,
            month: monthCount,
            all: lastMonthCount,
            todayBreakdown: buildBreakdown(todayTotal, todayNotCreated, todayNotDeposit, todayDeposit),
            weekBreakdown: buildBreakdown(weekTotal, weekNotCreated, weekNotDeposit, weekDeposit),
            monthBreakdown: buildBreakdown(monthTotal, monthNotCreated, monthNotDeposit, monthDeposit),
            allBreakdown: buildBreakdown(lastMonthTotal, lastMonthNotCreated, lastMonthNotDeposit, lastMonthDeposit),
          },
        }],
        teams: { KING88: 0, SKY24: 0, B88: 0 },
      });
    }

    // Get stats for all filtered agents
    const [todayStats, weekStats, monthStats, lastMonthStats,
      todayTotalStats, todayNotCreatedStats, todayNotDepositStats, todayDepositStats,
      weekTotalStats, weekNotCreatedStats, weekNotDepositStats, weekDepositStats,
      monthTotalStats, monthNotCreatedStats, monthNotDepositStats, monthDepositStats,
      lastMonthTotalStats, lastMonthNotCreatedStats, lastMonthNotDepositStats, lastMonthDepositStats,
      teamStats] = await Promise.all([
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: todayStart } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: weekStart } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: monthStart } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: todayStart } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: todayStart }, result: "NOT_CREATED" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: todayStart }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: todayStart }, result: "DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart }, result: "NOT_CREATED" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart }, result: "DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart }, result: "NOT_CREATED" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart }, result: "DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_CREATED" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" }), _count: true }),
      prisma.customer.groupBy({ by: ["team"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds } }), _count: true }),
    ]);

    // Build stats maps
    const buildStatsMap = (stats: any[]) => {
      const map: Record<string, number> = {};
      for (const s of stats) {
        map[s.agentId] = s._count;
      }
      return map;
    };

    const todayMap = buildStatsMap(todayStats);
    const weekMap = buildStatsMap(weekStats);
    const monthMap = buildStatsMap(monthStats);
    const lastMonthMap = buildStatsMap(lastMonthStats);
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
    for (const s of teamStats) {
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

    return NextResponse.json({ agents: agentStats, teams: teamStatsMap });
  } catch (error) {
    console.error("Stats GET error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
