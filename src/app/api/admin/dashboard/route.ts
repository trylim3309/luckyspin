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

    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Single query for all stats + prizes in parallel
    const [totalUsers, totalSpins, todaySpins, totalWins, recentSpins, prizes] = await Promise.all([
      prisma.user.count(),
      prisma.spinResult.count(),
      prisma.spinResult.count({ where: { createdAt: { gte: today } } }),
      prisma.spinResult.count({ where: { isWin: true } }),
      prisma.spinResult.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          isWin: true,
          createdAt: true,
          prize: { select: { name: true } },
          user: { select: { firstName: true, username: true } },
        },
      }),
      prisma.prize.findMany({
        select: { name: true, stock: true, totalWinCount: true },
      }),
    ]);

    const totalRemainingStock = prizes.reduce((sum, p) => sum + p.stock, 0);
    const topPrizes = prizes
      .filter((p) => p.totalWinCount > 0)
      .sort((a, b) => b.totalWinCount - a.totalWinCount)
      .slice(0, 5)
      .map((p) => ({ name: p.name, wins: p.totalWinCount }));

    return NextResponse.json({
      stats: {
        totalUsers,
        totalSpins,
        todaySpins,
        totalWinners: totalWins,
        totalPrizesClaimed: totalWins,
        totalRemainingStock,
      },
      recentSpins,
      topPrizes,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
