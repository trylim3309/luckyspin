import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSpinResult } from "@/lib/spin-algorithm";

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch user with condition in parallel
    const [user, condition] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.spinCondition.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: "User blocked" }, { status: 403 });
    }

    if (condition && !condition.zeroBalanceCanSpin && user.balance <= 0 && !condition.freeSpinEnabled) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const spinResult = await calculateSpinResult({
      userId: user.id,
      userBalance: user.balance,
      condition,
    });

    if (spinResult.segmentIndex === -1 && !spinResult.prize) {
      return NextResponse.json({ error: spinResult.message }, { status: 400 });
    }

    // Do all writes in single transaction
    await prisma.$transaction(async (tx) => {
      if (spinResult.prize && spinResult.prize.type !== "EMPTY" && spinResult.prize.type !== "NO_WIN") {
        const updateData: any = {
          dailyWinCount: { increment: 1 },
          totalWinCount: { increment: 1 },
        };
        if (!spinResult.prize.unlimitedStock) {
          updateData.stock = { decrement: 1 };
        }
        await tx.prize.update({ where: { id: spinResult.prize.id }, data: updateData });
      }

      await tx.spinResult.create({
        data: {
          userId: user.id,
          prizeId: spinResult.prize?.id,
          isWin: spinResult.isWin,
          resultSource: spinResult.resultSource,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent"),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { totalWins: spinResult.isWin ? { increment: 1 } : undefined },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await tx.dailySpinCount.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: { spinCount: { increment: 1 } },
        create: { userId: user.id, date: today, spinCount: 1 },
      });
    });

    // Fetch updated data in parallel
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [updatedUser, dailySpin, latestCondition] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.dailySpinCount.findUnique({
        where: { userId_date: { userId: user.id, date: today } },
      }),
      prisma.spinCondition.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Calculate remaining spins with condition limits
    const usedToday = dailySpin?.spinCount || 0;
    const lifetimeRemaining = (updatedUser?.totalSpins || 0) - usedToday;
    let remaining = lifetimeRemaining;
    if (latestCondition && latestCondition.maxSpinsPerDay > 0) {
      remaining = Math.min(remaining, Math.max(0, latestCondition.maxSpinsPerDay - usedToday));
    }

    return NextResponse.json({
      success: true,
      result: {
        prizeId: spinResult.prize?.id,
        prizeName: spinResult.prize?.name,
        prizeType: spinResult.prize?.type,
        prizeValue: spinResult.prize?.value,
        prizeColor: spinResult.prize?.color,
        prizeImageUrl: (spinResult.prize as any)?.imageUrl || null,
        isWin: spinResult.isWin,
        resultSource: spinResult.resultSource,
        segmentIndex: spinResult.segmentIndex,
        message: spinResult.message,
      },
      user: {
        balance: updatedUser?.balance,
        totalSpins: updatedUser?.totalSpins,
        totalWins: updatedUser?.totalWins,
      },
      remainingSpins: Math.max(0, remaining),
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json({ error: "Spin failed" }, { status: 500 });
  }
}