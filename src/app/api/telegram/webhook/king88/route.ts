import { NextRequest, NextResponse } from "next/server";
import { processTelegramWebhook } from "@/lib/telegram";

// Disable body parsing for webhook verification
export const dynamic = "force-dynamic";

/**
 * Telegram Webhook Handler for KING88 Team
 * Set webhook URL: https://your-domain/api/telegram/webhook/king88
 */
export async function POST(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN_KING88;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN_KING88 is not configured");
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    // Verify the secret token for security
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    const expectedToken = process.env.TELEGRAM_BOT_SECRET_KING88;

    if (expectedToken && secretToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const result = await processTelegramWebhook(payload, botToken);

    if (result) {
      console.log("KING88 Telegram webhook processed:", result);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing KING88 Telegram webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
