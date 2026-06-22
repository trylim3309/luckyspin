import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Get pending Telegram links
 * GET /api/admin/telegram/pending
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingLinks = await prisma.pendingTelegramLink.findMany({
      where: { linked: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pendingLinks });
  } catch (error) {
    console.error("Get pending links error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
