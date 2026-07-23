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

    const today = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay, 0, 0, 0));

    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - daysToMonday);

    const monthStart = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, 1, 0, 0, 0));

    let lmMonth = cambodiaMonth - 1;
    let lmYear = cambodiaYear;
    if (lmMonth < 1) {
      lmMonth = 12;
      lmYear--;
    }
    const lastMonthStart = new Date(Date.UTC(lmYear, lmMonth - 1, 1, 0, 0, 0));
    const lastMonthEnd = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, 1, 0, 0, 0));

    const isAgent = session.role === "AGENT" || session.role === "TEAM_LEADER";

    // Deposit condition
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
    const buildBreakdown = (total: number, notCreated: number, notDeposit: number, deposit: number) => ({
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
        prisma.oldCustomer.count({ where: buildWhere({ ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ ...depositCondition, createdAt: { gte: today } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ ...depositCondition, createdAt: { gte: weekStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ ...depositCondition, createdAt: { gte: monthStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ team: session.team, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today }, result: "DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart }, result: "DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart }, result: "DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" }) }),
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

    // Admin sees all stats
    const agentWhere: any = {};
    if (filterTeam && filterTeam !== "all") {
      agentWhere.teams = { hasSome: [filterTeam] };
    }

    const allAgents = await prisma.adminUser.findMany({
      where: agentWhere,
      select: { id: true, name: true, fullName: true, role: true },
      orderBy: { name: "asc" },
    });

    const agentIds = allAgents.map(a => a.id);
    const agentMap = new Map(allAgents.map(a => [a.id, a]));

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
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: today } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: weekStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: monthStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, ...depositCondition, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: today } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: today }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: today }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: today }, result: "DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: weekStart }, result: "DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: monthStart }, result: "DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, callStatus: "NOT_CONTACTED" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" }) }),
        prisma.oldCustomer.count({ where: buildWhere({ agentId: filterAgentId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" }) }),
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
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: today } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: weekStart } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: monthStart } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: today } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: today }, callStatus: "NOT_CONTACTED" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: today }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: today }, result: "DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart }, callStatus: "NOT_CONTACTED" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: weekStart }, result: "DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart }, callStatus: "NOT_CONTACTED" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: monthStart }, result: "DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, callStatus: "NOT_CONTACTED" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "NOT_DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["agentId"], where: buildWhere({ agentId: { in: agentIds }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, result: "DEPOSIT" }), _count: true }),
      prisma.oldCustomer.groupBy({ by: ["team"], where: buildWhere({ ...depositCondition, agentId: { in: agentIds } }), _count: true }),
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

    agentStats.sort((a, b) => b.stats.today - a.stats.today);

    return NextResponse.json({ agents: agentStats, teams: teamStatsMap });
  } catch (error) {
    console.error("Old Customers stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
