import { NextRequest, NextResponse } from "next/server";
import { sendTelegramBroadcast } from "@/lib/telegram";
import { auth } from "@/lib/auth";

/**
 * Broadcast a Telegram message to all users with linked Telegram accounts
 * POST /api/telegram/broadcast
 * Body: { message: string, parseMode?: "HTML" | "Markdown" }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, parseMode } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot token not configured" },
        { status: 500 }
      );
    }

    const result = await sendTelegramBroadcast(message, { parseMode });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      total: result.sent + result.failed,
    });
  } catch (error) {
    console.error("Error broadcasting Telegram message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
