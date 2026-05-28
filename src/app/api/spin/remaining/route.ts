import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [user, dailySpin, condition] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { totalSpins: true } }),
      prisma.dailySpinCount.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { spinCount: true },
      }),
      prisma.spinCondition.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate remaining spins:
    // 1. Start with user's totalSpins
    // 2. Subtract spins used today (from dailySpinCount)
    // 3. If condition has maxSpinsPerDay, also apply that as the limit
    const usedToday = dailySpin?.spinCount || 0;
    const lifetimeRemaining = user.totalSpins - usedToday;

    // Apply daily limit from condition if set
    let remaining = lifetimeRemaining;
    if (condition && condition.maxSpinsPerDay > 0) {
      const dailyLimitRemaining = Math.max(0, condition.maxSpinsPerDay - usedToday);
      remaining = Math.min(remaining, dailyLimitRemaining);
    }

    return NextResponse.json({
      remaining: Math.max(0, remaining),
      totalSpins: user.totalSpins,
      usedToday,
      dailyLimit: condition?.maxSpinsPerDay || null,
      _debug: {
        lifetimeRemaining,
        dailyLimitRemaining: condition ? Math.max(0, condition.maxSpinsPerDay - usedToday) : null
      }
    });
  } catch (error) {
    console.error("Remaining error:", error);
    return NextResponse.json({ error: "Failed to fetch remaining" }, { status: 500 });
  }
}