import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const controls = await prisma.resultControl.findMany({
      include: { prize: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ controls });
  } catch (error) {
    console.error("ResultControl GET error:", error);
    return NextResponse.json({ error: "Failed to fetch controls" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const control = await prisma.resultControl.create({
      data: {
        mode: body.mode || "RANDOM",
        globalWinPercentage: body.globalWinPercentage ?? 100,
        globalLosePercentage: body.globalLosePercentage ?? 0,
        forcedPrizeId: body.forcedPrizeId,
        targetTelegramId: body.targetTelegramId,
        forceWin: body.forceWin ?? false,
        forceLose: body.forceLose ?? false,
        blockBigPrize: body.blockBigPrize ?? false,
        isActive: body.isActive ?? true,
      },
      include: { prize: true },
    });

    return NextResponse.json({ control });
  } catch (error) {
    console.error("ResultControl POST error:", error);
    return NextResponse.json({ error: "Failed to create control" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Control ID required" }, { status: 400 });
    }

    const control = await prisma.resultControl.update({
      where: { id: body.id },
      data: {
        mode: body.mode,
        globalWinPercentage: body.globalWinPercentage,
        globalLosePercentage: body.globalLosePercentage,
        forcedPrizeId: body.forcedPrizeId,
        targetTelegramId: body.targetTelegramId,
        forceWin: body.forceWin,
        forceLose: body.forceLose,
        blockBigPrize: body.blockBigPrize,
        isActive: body.isActive,
      },
      include: { prize: true },
    });

    return NextResponse.json({ control });
  } catch (error) {
    console.error("ResultControl PUT error:", error);
    return NextResponse.json({ error: "Failed to update control" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Control ID required" }, { status: 400 });
    }

    await prisma.resultControl.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ResultControl DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete control" }, { status: 500 });
  }
}