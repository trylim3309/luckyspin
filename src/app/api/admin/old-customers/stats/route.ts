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

    // Get user's team from session
    const userTeams = session.teams || ["KING88"];
    const userTeam = userTeams[0];
    // Users with admin/manager roles can see all teams, others see only their team's data
    const canViewAllTeams = ["ADMIN", "SUPER_ADMIN", "MANAGER", "TEAM_LEADER"].includes(session.role);

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

    // Build base where clause based on filters
    const buildWhere = (extra: any = {}) => {
      const where: any = { ...extra };
      // Users with admin/manager roles can see all teams, others see only their team's data
      if (!canViewAllTeams) {
        where.team = userTeam;
      } else if (filterTeam && filterTeam !== "all") {
        where.team = filterTeam;
      }
      return where;
    };

    // Helper to build breakdown
    const buildBreakdown = (total: number, notContacted: number, chatted: number, called: number) => ({
      total,
      notContacted,
      chatted,
      called,
    });

    // Get stats by team
    const [
      todayTotal,
      todayNotContacted,
      todayChatted,
      todayCalled,
      weekTotal,
      weekNotContacted,
      weekChatted,
      weekCalled,
      monthTotal,
      monthNotContacted,
      monthChatted,
      monthCalled,
      lastMonthTotal,
      lastMonthNotContacted,
      lastMonthChatted,
      lastMonthCalled,
      teamStats,
    ] = await Promise.all([
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today } }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today }, callStatus: "NOT_CONTACTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today }, callStatus: "CHATTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: today }, callStatus: "CALLED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart } }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart }, callStatus: "NOT_CONTACTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart }, callStatus: "CHATTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: weekStart }, callStatus: "CALLED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart } }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart }, callStatus: "NOT_CONTACTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart }, callStatus: "CHATTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: monthStart }, callStatus: "CALLED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lt: lastMonthEnd } }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lt: lastMonthEnd }, callStatus: "NOT_CONTACTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lt: lastMonthEnd }, callStatus: "CHATTED" }) }),
      prisma.oldCustomer.count({ where: buildWhere({ createdAt: { gte: lastMonthStart, lt: lastMonthEnd }, callStatus: "CALLED" }) }),
      prisma.oldCustomer.groupBy({ by: ["team"], where: buildWhere({}), _count: true }),
    ]);

    const teamStatsMap: Record<string, number> = { KING88: 0, SKY24: 0, B88: 0 };
    for (const s of teamStats) {
      teamStatsMap[s.team] = s._count;
    }

    const stats = {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      lastMonth: lastMonthTotal,
      todayBreakdown: buildBreakdown(todayTotal, todayNotContacted, todayChatted, todayCalled),
      weekBreakdown: buildBreakdown(weekTotal, weekNotContacted, weekChatted, weekCalled),
      monthBreakdown: buildBreakdown(monthTotal, monthNotContacted, monthChatted, monthCalled),
      lastMonthBreakdown: buildBreakdown(lastMonthTotal, lastMonthNotContacted, lastMonthChatted, lastMonthCalled),
    };

    return NextResponse.json({ stats, teams: teamStatsMap });
  } catch (error) {
    console.error("Old Customers stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
