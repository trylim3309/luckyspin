import { prisma } from "@/lib/prisma";
import { Prize, SpinResult, ResultSource } from "@prisma/client";

interface SpinContext {
  userId: string;
  userBalance: number;
}

interface SpinResultData {
  prize: Prize | null;
  isWin: boolean;
  resultSource: ResultSource;
  segmentIndex: number;
  message: string;
}

interface WeightedPrize {
  prize: Prize;
  weight: number;
  segmentIndex: number;
}

export async function calculateSpinResult(ctx: SpinContext): Promise<SpinResultData> {
  const condition = await prisma.spinCondition.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (condition) {
    const conditionCheck = await checkSpinConditions(ctx, condition);
    if (!conditionCheck.allowed) {
      return {
        prize: null,
        isWin: false,
        resultSource: "RANDOM",
        segmentIndex: -1,
        message: conditionCheck.reason || "Cannot spin right now",
      };
    }
  }

  const resultControl = await prisma.resultControl.findFirst({
    where: {
      isActive: true,
      OR: [
        { mode: { in: ["ADMIN_CONTROL", "RANDOM"] } },
      ],
    },
    include: { prize: true },
    orderBy: { createdAt: "desc" },
  });

  if (resultControl) {
    if (resultControl.forceWin && resultControl.forcedPrizeId) {
      const prize = await prisma.prize.findUnique({
        where: { id: resultControl.forcedPrizeId },
      });
      if (prize && prize.isActive && prize.stock > 0) {
        return {
          prize,
          isWin: true,
          resultSource: "FORCE_WIN",
          segmentIndex: -1,
          message: `អ្នកទទួលបាន ${prize.name}!`,
        };
      }
    }

    if (resultControl.forceLose) {
      const emptyPrize = await getEmptyPrize();
      return {
        prize: emptyPrize,
        isWin: false,
        resultSource: "FORCE_LOSE",
        segmentIndex: -1,
        message: "Better luck next time!",
      };
    }
  }

  const prizes = await prisma.prize.findMany({
    where: {
      isActive: true,
    },
    orderBy: { displayOrder: "asc" },
  });

  if (prizes.length === 0) {
    return {
      prize: null,
      isWin: false,
      resultSource: "RANDOM",
      segmentIndex: -1,
      message: "No prizes available",
    };
  }

  // Separate prizes with stock > 0 from prizes with no stock
  const prizesWithStock = prizes.filter(p => p.stock > 0);
  const prizesWithoutStock = prizes.filter(p => p.stock <= 0);

  // If no prizes with stock, can't spin
  if (prizesWithStock.length === 0) {
    return {
      prize: null,
      isWin: false,
      resultSource: "RANDOM",
      segmentIndex: -1,
      message: "No prizes available",
    };
  }

  // Build weighted prizes from prizes with stock
  const weightedPrizes: WeightedPrize[] = prizesWithStock.map((prize, index) => ({
    prize,
    weight: prize.probability,
    segmentIndex: prizes.indexOf(prize), // Use actual index in full prize list
  }));

  // Add EMPTY prize if not present (for prizes without stock)
  const hasEmptyPrize = prizes.some((wp) => wp.type === "EMPTY" || wp.type === "NO_WIN");
  if (!hasEmptyPrize) {
    const emptyPrize = await getEmptyPrize();
    if (emptyPrize) {
      const emptyIndex = prizes.length;
      weightedPrizes.push({
        prize: emptyPrize,
        weight: Math.max(0, 100 - weightedPrizes.reduce((sum, wp) => sum + wp.weight, 0)),
        segmentIndex: emptyIndex,
      });
    }
  }

  // If prizes without stock exist, they should be treated as EMPTY
  // Filter out prizes without stock from weighted selection
  const selectablePrizes = weightedPrizes.filter(wp => wp.prize.stock > 0);

  if (selectablePrizes.length === 0) {
    return {
      prize: null,
      isWin: false,
      resultSource: "RANDOM",
      segmentIndex: -1,
      message: "No prizes available",
    };
  }

  const selectedPrize = selectWeightedPrize(selectablePrizes);

  return {
    prize: selectedPrize.prize,
    isWin: selectedPrize.prize.type !== "EMPTY" && selectedPrize.prize.type !== "NO_WIN",
    resultSource: "RANDOM",
    segmentIndex: selectedPrize.segmentIndex,
    message: selectedPrize.prize.type === "EMPTY" ? "Better luck next time!" : `You won ${selectedPrize.prize.name}!`,
  };
}

async function checkSpinConditions(
  ctx: SpinContext,
  condition: {
    maxSpinsPerDay: number;
    minBalanceRequired: number;
    zeroBalanceCanSpin: boolean;
    freeSpinEnabled: boolean;
    winCooldownMinutes: number;
    startDate: Date | null;
    endDate: Date | null;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  if (ctx.userBalance < condition.minBalanceRequired && !condition.zeroBalanceCanSpin) {
    return {
      allowed: false,
      reason: `Minimum balance of ${condition.minBalanceRequired} required to spin`,
    };
  }

  if (condition.winCooldownMinutes > 0) {
    const lastSpin = await prisma.spinResult.findFirst({
      where: {
        userId: ctx.userId,
        isWin: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastSpin) {
      const cooldownEnd = new Date(lastSpin.createdAt.getTime() + condition.winCooldownMinutes * 60 * 1000);
      if (new Date() < cooldownEnd) {
        const minutesLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000);
        return {
          allowed: false,
          reason: `Please wait ${minutesLeft} minutes before spinning again`,
        };
      }
    }
  }

  if (condition.startDate && new Date() < condition.startDate) {
    return { allowed: false, reason: "Campaign has not started yet" };
  }
  if (condition.endDate && new Date() > condition.endDate) {
    return { allowed: false, reason: "Campaign has ended" };
  }

  return { allowed: true };
}

async function getEmptyPrize(): Promise<Prize | null> {
  return prisma.prize.findFirst({
    where: {
      OR: [{ type: "EMPTY" }, { type: "NO_WIN" }],
      isActive: true,
    },
  });
}

function selectWeightedPrize(weightedPrizes: WeightedPrize[]): WeightedPrize {
  const totalWeight = weightedPrizes.reduce((sum, wp) => sum + wp.weight, 0);
  let random = Math.random() * totalWeight;

  for (const wp of weightedPrizes) {
    random -= wp.weight;
    if (random <= 0) {
      return wp;
    }
  }

  return weightedPrizes[weightedPrizes.length - 1];
}

export async function recordSpinResult(
  ctx: { userId: string; ipAddress?: string; userAgent?: string },
  result: SpinResultData
): Promise<SpinResult> {
  return prisma.spinResult.create({
    data: {
      userId: ctx.userId,
      prizeId: result.prize?.id,
      isWin: result.isWin,
      resultSource: result.resultSource,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });
}

export async function updatePrizeStock(prizeId: string): Promise<void> {
  await prisma.prize.update({
    where: { id: prizeId },
    data: {
      stock: { decrement: 1 },
      dailyWinCount: { increment: 1 },
      totalWinCount: { increment: 1 },
    },
  });
}

export async function incrementDailySpinCount(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailySpinCount.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      spinCount: { increment: 1 },
    },
    create: {
      userId,
      date: today,
      spinCount: 1,
    },
  });
}