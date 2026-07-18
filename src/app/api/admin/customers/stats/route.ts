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

    const isAgent = session.role === "AGENT" || session.role === "TEAM_LEADER" || session.role === "MANAGER";

    // Agents only see their own stats + team totals
    if (isAgent) {
      const [myCustomers, teamCustomers] = await Promise.all([
        prisma.customer.findMany({
          where: { agentId: session.id },
          select: { createdAt: true, team: true },
        }),
        prisma.customer.findMany({
          where: { team: session.team },
          select: { agentId: true, createdAt: true, team: true },
        }),
      ]);

      const myStats = { today: 0, week: 0, month: 0, all: myCustomers.length };
      for (const c of myCustomers) {
        if (c.createdAt >= todayStart) myStats.today++;
        if (c.createdAt >= weekStart) myStats.week++;
        if (c.createdAt >= monthStart) myStats.month++;
      }

      const teamStats = { [session.team]: 0 };
      for (const c of teamCustomers) {
        if (teamStats[c.team] !== undefined) teamStats[c.team]++;
      }

      return NextResponse.json({
        agents: [{ id: session.id, name: session.name, role: session.role, stats: myStats }],
        teams: teamStats,
      });
    }

    // Admin sees all stats
    const [allAgents, customers] = await Promise.all([
      prisma.adminUser.findMany({
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.customer.findMany({
        select: { agentId: true, team: true, createdAt: true },
      }),
    ]);

    const byAgent: Record<string, { today: number; week: number; month: number; all: number }> = {};
    for (const agent of allAgents) {
      byAgent[agent.id] = { today: 0, week: 0, month: 0, all: 0 };
    }

    for (const c of customers) {
      if (byAgent[c.agentId]) {
        byAgent[c.agentId].all++;
        if (c.createdAt >= todayStart) byAgent[c.agentId].today++;
        if (c.createdAt >= weekStart) byAgent[c.agentId].week++;
        if (c.createdAt >= monthStart) byAgent[c.agentId].month++;
      }
    }

    const agentStats = allAgents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      stats: byAgent[a.id] || { today: 0, week: 0, month: 0, all: 0 },
    }));

    // Sort by today's count descending
    agentStats.sort((a, b) => b.stats.today - a.stats.today);

    const teamStats = { KING88: 0, SKY24: 0, B88: 0 };
    for (const c of customers) {
      if (teamStats[c.team as keyof typeof teamStats] !== undefined) {
        teamStats[c.team as keyof typeof teamStats]++;
      }
    }

    return NextResponse.json({ agents: agentStats, teams: teamStats });
  } catch (error) {
    console.error("Customers stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
