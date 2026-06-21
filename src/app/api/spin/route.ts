import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSpinResult } from "@/lib/spin-algorithm";
import { broadcast, REALTIME_EVENTS } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("spin_user_id")?.value;
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

    // Update user's spinConditionId if not set
    if (condition && !user.spinConditionId) {
      await prisma.user.update({
        where: { id: userId },
        data: { spinConditionId: condition.id },
      });
    }

    if (condition && !condition.zeroBalanceCanSpin && user.balance <= 0 && !condition.freeSpinEnabled) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch today's daily spin count and total lifetime spins in parallel
    const [dailySpinBefore, totalSpinCount] = await Promise.all([
      prisma.dailySpinCount.findUnique({
        where: { userId_date: { userId: user.id, date: today } },
        select: { spinCount: true },
      }),
      // Only needed for FIXED type, but fetch in parallel for efficiency
      condition?.spinType === "FIXED"
        ? prisma.spinResult.count({ where: { userId: user.id } })
        : Promise.resolve(0),
    ]);

    const dailyUsedBefore = dailySpinBefore?.spinCount || 0;

    // Check spin limits based on spinType
    if (condition) {
      if (condition.spinType === "FIXED") {
        // FIXED: just check if user has spins left (totalSpins > 0)
        if (user.totalSpins <= 0) {
          return NextResponse.json({ error: "No spins left" }, { status: 400 });
        }
      } else {
        // DAILY: only check daily limit
        if (condition.maxSpinsPerDay > 0 && dailyUsedBefore >= condition.maxSpinsPerDay) {
          return NextResponse.json({ error: "Daily spin limit reached" }, { status: 400 });
        }
      }
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

    // Decrement user's spins after successful spin (for FIXED type)
    await prisma.user.update({
      where: { id: user.id },
      data: { totalSpins: { decrement: 1 } },
    });

    // These are independent — run in parallel, no transaction needed
    await Promise.all([
      prisma.user.update({ where: { id: user.id }, data: { totalWins: spinResult.isWin ? { increment: 1 } : undefined } }),
      prisma.dailySpinCount.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: { spinCount: { increment: 1 } },
        create: { userId: user.id, date: today, spinCount: 1 },
      }),
    ]);

    broadcast(REALTIME_EVENTS.SPIN_COMPLETED, {
      userId: user.id,
      prize: spinResult.prize,
      isWin: spinResult.isWin,
    });

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
      remainingSpins: calculateRemainingSpins(condition, user.totalSpins, totalSpinCount, dailyUsedBefore),
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json({ error: "Spin failed" }, { status: 500 });
  }
}

function calculateRemainingSpins(
  condition: { spinType: string; maxSpins: number; maxSpinsPerDay: number } | null,
  userTotalSpins: number,
  lifetimeUsed: number,
  dailyUsed: number
): number {
  if (!condition) return Infinity;

  if (condition.spinType === "FIXED") {
    // FIXED: spinsLeft = totalSpins (what admin deposited)
    return userTotalSpins;
  } else {
    // DAILY: spins per day
    if (condition.maxSpinsPerDay === 0) return 0;
    return Math.max(0, condition.maxSpinsPerDay - dailyUsed);
  }
}