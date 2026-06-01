import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast, REALTIME_EVENTS } from "@/lib/realtime";

function getAdminFromSession(req: NextRequest) {
  const adminSession = req.cookies.get("admin_session");
  if (!adminSession) return null;

  try {
    return JSON.parse(Buffer.from(adminSession.value, "base64").toString());
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = getAdminFromSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prizes = await prisma.prize.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Prizes GET error:", error);
    return NextResponse.json({ error: "Failed to fetch prizes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAdminFromSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: "Prize name is required" }, { status: 400 });
    }

    console.log("Creating prize:", body);

    const prize = await prisma.prize.create({
      data: {
        name: body.name,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        color: body.color || "#ffffff",
        value: body.value ?? 0,
        type: body.type || "MONEY",
        stock: body.stock ?? 0,
        unlimitedStock: body.unlimitedStock ?? false,
        probability: body.probability ?? 0,
        minBalanceRequired: body.minBalanceRequired ?? 0,
        dailyWinLimit: body.dailyWinLimit ?? 0,
        totalWinLimit: body.totalWinLimit ?? 0,
        isActive: body.isActive ?? true,
        displayOrder: body.displayOrder ?? 0,
      },
    });

    broadcast(REALTIME_EVENTS.PRIZE_CREATED, prize);
    return NextResponse.json({ prize });
  } catch (error) {
    console.error("Prizes POST error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to create prize" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getAdminFromSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Prize ID required" }, { status: 400 });
    }

    const prize = await prisma.prize.update({
      where: { id: body.id },
      data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        color: body.color,
        value: body.value,
        type: body.type,
        stock: body.stock,
        unlimitedStock: body.unlimitedStock ?? false,
        probability: body.probability,
        minBalanceRequired: body.minBalanceRequired,
        dailyWinLimit: body.dailyWinLimit,
        totalWinLimit: body.totalWinLimit,
        isActive: body.isActive,
        displayOrder: body.displayOrder ?? 0,
      },
    });

    broadcast(REALTIME_EVENTS.PRIZE_UPDATED, prize);

    return NextResponse.json({ prize });
  } catch (error) {
    console.error("Prizes PUT error:", error);
    return NextResponse.json({ error: "Failed to update prize" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getAdminFromSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Prize ID required" }, { status: 400 });
    }

    await prisma.prize.delete({
      where: { id },
    });

    broadcast(REALTIME_EVENTS.PRIZE_DELETED, { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Prizes DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete prize" }, { status: 500 });
  }
}