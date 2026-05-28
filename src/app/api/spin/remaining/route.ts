import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalSpins: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailySpin = await prisma.dailySpinCount.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    const remaining = user.totalSpins - (dailySpin?.spinCount || 0);

    return NextResponse.json({
      remaining: Math.max(0, remaining),
      totalSpins: user.totalSpins,
      usedToday: dailySpin?.spinCount || 0,
      resetAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Remaining error:", error);
    return NextResponse.json({ error: "Failed to fetch remaining" }, { status: 500 });
  }
}