import { prisma } from "@/lib/prisma";
import { Prize, SpinResult, ResultSource } from "@prisma/client";

interface SpinContext {
  userId: string;
  userBalance: number;
  condition?: {
    zeroBalanceCanSpin: boolean;
    freeSpinEnabled: boolean;
    maxSpinsPerDay: number;
  } | null;
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

let prizesCache: { data: Prize[]; timestamp: number } | null = null;
const PRIZES_CACHE_TTL = 30000; // 30 seconds

export async function calculateSpinResult(ctx: SpinContext): Promise<SpinResultData> {
  // Use cached condition if passed from parent, otherwise fetch once
  const condition = ctx.condition || await prisma.spinCondition.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (condition && !condition.zeroBalanceCanSpin && ctx.userBalance <= 0 && !condition.freeSpinEnabled) {
    return {
      prize: null,
      isWin: false,
      resultSource: "RANDOM",
      segmentIndex: -1,
      message: "Insufficient balance",
    };
  }

  // Fetch resultControl and prizes in parallel
  const [resultControl, prizes] = await Promise.all([
    prisma.resultControl.findFirst({
      where: { isActive: true },
      include: { prize: true },
      orderBy: { createdAt: "desc" },
    }),
    getCachedPrizes(),
  ]);

  if (resultControl) {
    if (resultControl.forceWin && resultControl.forcedPrizeId) {
      const prize = resultControl.prize;
      if (prize && prize.isActive && (prize.stock > 0 || prize.unlimitedStock)) {
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
      return {
        prize: null,
        isWin: false,
        resultSource: "FORCE_LOSE",
        segmentIndex: -1,
        message: "Better luck next time!",
      };
    }
  }

  if (prizes.length === 0) {
    return {
      prize: null,
      isWin: false,
      resultSource: "RANDOM",
      segmentIndex: -1,
      message: "No prizes available",
    };
  }

  const prizesWithStock = prizes.filter(p => p.stock > 0 || p.unlimitedStock);
  if (prizesWithStock.length === 0) {
    return {
      prize: null,
      isWin: false,
      resultSource: "RANDOM",
      segmentIndex: -1,
      message: "No prizes available",
    };
  }

  const totalWeight = prizesWithStock.reduce((sum, p) => sum + p.probability, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < prizesWithStock.length; i++) {
    random -= prizesWithStock[i].probability;
    if (random <= 0) {
      const selectedPrize = prizesWithStock[i];
      return {
        prize: selectedPrize,
        isWin: selectedPrize.type !== "EMPTY" && selectedPrize.type !== "NO_WIN",
        resultSource: "RANDOM",
        segmentIndex: i,
        message: selectedPrize.type === "EMPTY" ? "Better luck next time!" : `អ្នកទទួលបាន ${selectedPrize.name}!`,
      };
    }
  }

  // Fallback to first prize
  return {
    prize: prizesWithStock[0],
    isWin: prizesWithStock[0].type !== "EMPTY",
    resultSource: "RANDOM",
    segmentIndex: 0,
    message: `អ្នកទទួលបាន ${prizesWithStock[0].name}!`,
  };
}

async function getCachedPrizes(): Promise<Prize[]> {
  const now = Date.now();
  if (prizesCache && (now - prizesCache.timestamp) < PRIZES_CACHE_TTL) {
    return prizesCache.data;
  }

  const prizes = await prisma.prize.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      type: true,
      value: true,
      stock: true,
      unlimitedStock: true,
      probability: true,
    },
  });

  prizesCache = { data: prizes as Prize[], timestamp: now };
  return prizes;
}

export async function recordSpinResult(
  tx: any,
  data: {
    userId: string;
    prizeId: string | null;
    isWin: boolean;
    resultSource: string;
    ipAddress: string;
    userAgent: string | null;
  }
): Promise<void> {
  await tx.spinResult.create({ data });
}

export async function updatePrizeStock(prizeId: string, unlimitedStock?: boolean): Promise<void> {
  if (!unlimitedStock) {
    await prisma.prize.update({
      where: { id: prizeId },
      data: { stock: { decrement: 1 } },
    });
  }
}

export async function incrementDailySpinCount(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailySpinCount.upsert({
    where: { userId_date: { userId, date: today } },
    update: { spinCount: { increment: 1 } },
    create: { userId, date: today, spinCount: 1 },
  });
}