import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("spin_user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dailySpin, condition, user, totalSpinCount] = await Promise.all([
      prisma.dailySpinCount.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { spinCount: true },
      }),
      prisma.spinCondition.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { totalSpins: true },
      }),
      prisma.spinResult.count({ where: { userId } }),
    ]);

    const usedToday = dailySpin?.spinCount || 0;
    let remaining: number;
    let maxSpins: number;

    if (!condition) {
      remaining = Infinity;
      maxSpins = 0;
    } else if (condition.spinType === "FIXED") {
      // FIXED: use user's totalSpins (what admin deposited)
      maxSpins = user?.totalSpins || 0;
      remaining = maxSpins;
    } else {
      maxSpins = condition.maxSpinsPerDay;
      if (condition.maxSpinsPerDay === 0) {
        remaining = 0;
      } else {
        remaining = Math.max(0, condition.maxSpinsPerDay - usedToday);
      }
    }

    return NextResponse.json({
      remaining,
      usedToday,
      spinType: condition?.spinType || "FIXED",
      maxSpins,
    });
  } catch (error) {
    console.error("Remaining error:", error);
    return NextResponse.json({ error: "Failed to fetch remaining" }, { status: 500 });
  }
}
