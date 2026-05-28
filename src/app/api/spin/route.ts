import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSpinResult, recordSpinResult, updatePrizeStock, incrementDailySpinCount } from "@/lib/spin-algorithm";

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: "User blocked" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const condition = await prisma.spinCondition.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (condition && !condition.zeroBalanceCanSpin && user.balance <= 0 && !condition.freeSpinEnabled) {
      return NextResponse.json(
        { error: "Insufficient balance. Please add funds to continue spinning." },
        { status: 400 }
      );
    }

    const spinResult = await calculateSpinResult({
      userId: user.id,
      userBalance: user.balance,
    });

    if (spinResult.segmentIndex === -1 && !spinResult.prize) {
      return NextResponse.json({ error: spinResult.message }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (spinResult.prize && spinResult.prize.type !== "EMPTY" && spinResult.prize.type !== "NO_WIN") {
        await tx.prize.update({
          where: { id: spinResult.prize.id },
          data: {
            stock: { decrement: 1 },
            dailyWinCount: { increment: 1 },
            totalWinCount: { increment: 1 },
          },
        });
      }

      await tx.spinResult.create({
        data: {
          userId: user.id,
          prizeId: spinResult.prize?.id,
          isWin: spinResult.isWin,
          resultSource: spinResult.resultSource,
          ipAddress: ip,
          userAgent: req.headers.get("user-agent"),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          totalWins: spinResult.isWin ? { increment: 1 } : undefined,
        },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await tx.dailySpinCount.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          },
        },
        update: {
          spinCount: { increment: 1 },
        },
        create: {
          userId: user.id,
          date: today,
          spinCount: 1,
        },
      });
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    // Get remaining spins for response
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailySpin = await prisma.dailySpinCount.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });
    // remaining = total spins user has - spins used today
    const remainingSpins = Math.max(0, (updatedUser?.totalSpins || 0) - (dailySpin?.spinCount || 0));

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
      remainingSpins,
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json({ error: "Spin failed" }, { status: 500 });
  }
}