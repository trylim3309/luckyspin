import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast, REALTIME_EVENTS } from "@/lib/realtime";

export async function GET() {
  try {
    const conditions = await prisma.spinCondition.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ conditions });
  } catch (error) {
    console.error("Conditions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch conditions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const condition = await prisma.spinCondition.create({
      data: {
        name: body.name,
        spinType: body.spinType || "FIXED",
        maxSpins: body.maxSpins ?? 0,
        maxSpinsPerDay: body.maxSpinsPerDay ?? 10,
        minBalanceRequired: body.minBalanceRequired ?? 0,
        zeroBalanceCanSpin: body.zeroBalanceCanSpin ?? false,
        freeSpinEnabled: body.freeSpinEnabled ?? true,
        ipLimitEnabled: body.ipLimitEnabled ?? false,
        deviceLimitEnabled: body.deviceLimitEnabled ?? false,
        winCooldownMinutes: body.winCooldownMinutes ?? 0,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        isActive: body.isActive ?? true,
      },
    });

    broadcast(REALTIME_EVENTS.CONDITION_UPDATED, condition);

    return NextResponse.json({ condition });
  } catch (error) {
    console.error("Conditions POST error:", error);
    return NextResponse.json({ error: "Failed to create condition" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Condition ID required" }, { status: 400 });
    }

    const condition = await prisma.spinCondition.update({
      where: { id: body.id },
      data: {
        name: body.name,
        spinType: body.spinType || "FIXED",
        maxSpins: body.maxSpins ?? 0,
        maxSpinsPerDay: body.maxSpinsPerDay ?? 10,
        minBalanceRequired: body.minBalanceRequired,
        zeroBalanceCanSpin: body.zeroBalanceCanSpin,
        freeSpinEnabled: body.freeSpinEnabled,
        ipLimitEnabled: body.ipLimitEnabled,
        deviceLimitEnabled: body.deviceLimitEnabled,
        winCooldownMinutes: body.winCooldownMinutes,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        isActive: body.isActive,
      },
    });

    broadcast(REALTIME_EVENTS.CONDITION_UPDATED, condition);

    return NextResponse.json({ condition });
  } catch (error) {
    console.error("Conditions PUT error:", error);
    return NextResponse.json({ error: "Failed to update condition" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Condition ID required" }, { status: 400 });
    }

    await prisma.spinCondition.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Conditions DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete condition" }, { status: 500 });
  }
}