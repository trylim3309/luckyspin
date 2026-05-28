import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check for admin session
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

    const [
      totalUsers,
      totalSpins,
      todaySpins,
      totalWinners,
      totalPrizesClaimed,
      prizes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.spinResult.count(),
      prisma.spinResult.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.spinResult.count({ where: { isWin: true } }),
      prisma.spinResult.count({ where: { isWin: true } }),
      prisma.prize.findMany({
        select: { name: true, stock: true, totalWinCount: true },
      }),
    ]);

    // Get recent spin results
    const recentSpins = await prisma.spinResult.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, username: true } },
        prize: { select: { name: true, type: true } },
      },
    });

    // Calculate total remaining prize stock
    const totalRemainingStock = prizes.reduce((sum, p) => sum + p.stock, 0);

    // Top winning prizes
    const topPrizes = prizes
      .map((p) => ({ name: p.name, wins: p.totalWinCount }))
      .filter((p) => p.wins > 0)
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalSpins,
        todaySpins,
        totalWinners,
        totalPrizesClaimed,
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