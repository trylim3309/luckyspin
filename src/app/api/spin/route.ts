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

    // Minimal transaction: only prize stock + spin record need atomicity
    await prisma.$transaction(async (tx) => {
      if (spinResult.prize && spinResult.prize.type !== "EMPTY" && spinResult.prize.type !== "NO_WIN") {
        if (!spinResult.prize.unlimitedStock) {
          await tx.prize.update({ where: { id: spinResult.prize.id }, data: { stock: { decrement: 1 } } });
        }
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
    });

    // These are independent — run in parallel, no transaction needed
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Promise.all([
      prisma.user.update({ where: { id: user.id }, data: { totalWins: spinResult.isWin ? { increment: 1 } : undefined } }),
      prisma.dailySpinCount.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: { spinCount: { increment: 1 } },
        create: { userId: user.id, date: today, spinCount: 1 },
      }),
    ]);

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
        balance: user.balance,
        totalSpins: user.totalSpins,
        totalWins: user.totalWins,
      },
      remainingSpins: Math.max(0, (user.totalSpins || 0) - 1),
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json({ error: "Spin failed" }, { status: 500 });
  }
}