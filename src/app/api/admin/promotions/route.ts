import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const promotion = await prisma.promotion.findUnique({ where: { id } });
      return NextResponse.json({ promotions: promotion ? [promotion] : [] });
    }

    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("Promotions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAdminFromSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.title || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: "Title, start date, and end date are required" }, { status: 400 });
    }

    const promotion = await prisma.promotion.create({
      data: {
        title: body.title,
        description: body.description || null,
        remarks: body.remarks || null,
        imageUrl: body.imageUrl || null,
        type: body.type || "DISCOUNT",
        discount: body.discount ?? 0,
        team: body.team || "KING88",
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isActive: body.isActive ?? true,
        isClosed: body.isClosed ?? false,
      },
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("Promotions POST error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
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
      return NextResponse.json({ error: "Promotion ID required" }, { status: 400 });
    }

    const promotion = await prisma.promotion.update({
      where: { id: body.id },
      data: {
        title: body.title,
        description: body.description,
        remarks: body.remarks,
        imageUrl: body.imageUrl,
        type: body.type,
        discount: body.discount,
        team: body.team,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isActive: body.isActive,
        isClosed: body.isClosed,
      },
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("Promotions PUT error:", error);
    return NextResponse.json({ error: "Failed to update promotion" }, { status: 500 });
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
      return NextResponse.json({ error: "Promotion ID required" }, { status: 400 });
    }

    await prisma.promotion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Promotions DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete promotion" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getAdminFromSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Promotion ID required" }, { status: 400 });
    }

    // Toggle active status or close promotion
    const updateData: Record<string, boolean> = {};
    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }
    if (typeof body.isClosed === "boolean") {
      updateData.isClosed = body.isClosed;
    }

    const promotion = await prisma.promotion.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("Promotions PATCH error:", error);
    return NextResponse.json({ error: "Failed to update promotion" }, { status: 500 });
  }
}