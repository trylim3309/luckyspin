-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PrizeType" AS ENUM ('MONEY', 'COUPON', 'PRODUCT', 'FREE_SPIN', 'EMPTY', 'NO_WIN');

-- CreateEnum
CREATE TYPE "ControlMode" AS ENUM ('RANDOM', 'ADMIN_CONTROL', 'FORCE_WIN', 'FORCE_LOSE', 'USER_SPECIFIC');

-- CreateEnum
CREATE TYPE "ResultSource" AS ENUM ('RANDOM', 'ADMIN_CONTROL', 'FORCE_WIN', 'FORCE_LOSE', 'USER_CONTROLLED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "totalSpins" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#ffffff',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" "PrizeType" NOT NULL DEFAULT 'MONEY',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minBalanceRequired" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyWinLimit" INTEGER NOT NULL DEFAULT 0,
    "totalWinLimit" INTEGER NOT NULL DEFAULT 0,
    "dailyWinCount" INTEGER NOT NULL DEFAULT 0,
    "totalWinCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinCondition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxSpinsPerDay" INTEGER NOT NULL DEFAULT 10,
    "minBalanceRequired" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zeroBalanceCanSpin" BOOLEAN NOT NULL DEFAULT false,
    "freeSpinEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requireTelegramLogin" BOOLEAN NOT NULL DEFAULT true,
    "ipLimitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deviceLimitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "winCooldownMinutes" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpinCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultControl" (
    "id" TEXT NOT NULL,
    "mode" "ControlMode" NOT NULL DEFAULT 'RANDOM',
    "globalWinPercentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "globalLosePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forcedPrizeId" TEXT,
    "targetTelegramId" TEXT,
    "forceWin" BOOLEAN NOT NULL DEFAULT false,
    "forceLose" BOOLEAN NOT NULL DEFAULT false,
    "blockBigPrize" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prizeId" TEXT,
    "isWin" BOOLEAN NOT NULL DEFAULT false,
    "resultSource" "ResultSource" NOT NULL DEFAULT 'RANDOM',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSetting" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Lucky Spin',
    "subtitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "themeColor" TEXT NOT NULL DEFAULT '#FFD700',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySpinCount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spinCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailySpinCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultControl_forcedPrizeId_key" ON "ResultControl"("forcedPrizeId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSetting_name_key" ON "CampaignSetting"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DailySpinCount_userId_date_key" ON "DailySpinCount"("userId", "date");

-- AddForeignKey
ALTER TABLE "ResultControl" ADD CONSTRAINT "ResultControl_forcedPrizeId_fkey" FOREIGN KEY ("forcedPrizeId") REFERENCES "Prize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinResult" ADD CONSTRAINT "SpinResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinResult" ADD CONSTRAINT "SpinResult_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpinCount" ADD CONSTRAINT "DailySpinCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
