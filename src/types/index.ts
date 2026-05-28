import { Prize, SpinResult, User, SpinCondition, ResultControl } from "@prisma/client";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface SpinApiResponse {
  success: boolean;
  result?: {
    prizeId: string;
    prizeName: string;
    prizeType: string;
    prizeValue: number;
    prizeColor: string;
    isWin: boolean;
    resultSource: string;
    segmentIndex: number;
    message: string;
  };
  user?: {
    balance: number;
    totalSpins: number;
    totalWins: number;
  };
  error?: string;
}

export interface PrizeWithStats extends Prize {
  dailyWinCount: number;
  totalWinCount: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalSpins: number;
  todaySpins: number;
  totalWinners: number;
  totalPrizesClaimed: number;
  totalRemainingStock: number;
}

export interface SpinHistoryItem extends SpinResult {
  user: {
    telegramId: string;
    username: string | null;
    firstName: string;
  };
  prize: {
    name: string;
    type: string;
    value: number;
  } | null;
}

export interface AdminUser {
  id: string;
  name: string;
  role: "ADMIN" | "SUPER_ADMIN";
}

export interface ConditionFormData {
  name: string;
  maxSpinsPerDay: number;
  minBalanceRequired: number;
  zeroBalanceCanSpin: boolean;
  freeSpinEnabled: boolean;
  requireTelegramLogin: boolean;
  ipLimitEnabled: boolean;
  deviceLimitEnabled: boolean;
  winCooldownMinutes: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface ResultControlFormData {
  mode: "RANDOM" | "ADMIN_CONTROL" | "FORCE_WIN" | "FORCE_LOSE" | "USER_SPECIFIC";
  globalWinPercentage: number;
  globalLosePercentage: number;
  forcedPrizeId?: string;
  targetTelegramId?: string;
  forceWin: boolean;
  forceLose: boolean;
  blockBigPrize: boolean;
  isActive: boolean;
}