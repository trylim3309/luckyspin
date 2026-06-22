import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Get pending Telegram links
 * GET /api/admin/telegram/pending?team=SKY24
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const team = searchParams.get("team") || "SKY24";

    const pendingLinks = await prisma.pendingTelegramLink.findMany({
      where: {
        linked: false,
        team: team as "KING88" | "SKY24" | "B88",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pendingLinks });
  } catch (error) {
    console.error("Get pending links error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
