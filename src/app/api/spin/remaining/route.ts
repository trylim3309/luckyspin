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

    const [user, dailySpin] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { totalSpins: true } }),
      prisma.dailySpinCount.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { spinCount: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const usedToday = dailySpin?.spinCount || 0;
    const remaining = user.totalSpins - usedToday;

    return NextResponse.json({
      remaining: Math.max(0, remaining),
      totalSpins: user.totalSpins,
      usedToday,
    });
  } catch (error) {
    console.error("Remaining error:", error);
    return NextResponse.json({ error: "Failed to fetch remaining" }, { status: 500 });
  }
}
