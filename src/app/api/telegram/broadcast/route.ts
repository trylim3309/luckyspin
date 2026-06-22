import { NextRequest, NextResponse } from "next/server";
import { sendTelegramBroadcast } from "@/lib/telegram";
import { auth } from "@/lib/auth";

/**
 * Broadcast a Telegram message to all users with linked Telegram accounts
 * POST /api/telegram/broadcast
 * Body: { message: string, team?: "KING88" | "SKY24" | "B88", parseMode?: "HTML" | "Markdown" }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, team, parseMode } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const result = await sendTelegramBroadcast(message, {
      team: team || "SKY24",
      parseMode,
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      total: result.sent + result.failed,
      team: team || "SKY24",
    });
  } catch (error) {
    console.error("Error broadcasting Telegram message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
