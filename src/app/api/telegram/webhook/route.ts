import { NextRequest, NextResponse } from "next/server";
import { processTelegramWebhook, getTelegramBotService } from "@/lib/telegram";

// Disable body parsing for webhook verification
export const dynamic = "force-dynamic";

/**
 * Telegram Webhook Handler
 *
 * Receives updates from Telegram when users interact with the bot.
 * Set webhook URL: https://your-domain/api/telegram/webhook
 *
 * Security: Verify request using X-Telegram-Bot-Api-Secret-Token header
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the secret token for security
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    const expectedToken = process.env.TELEGRAM_BOT_SECRET;

    if (expectedToken && secretToken !== expectedToken) {
      console.error("Invalid Telegram webhook secret token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN is not configured");
      return NextResponse.json(
        { error: "Bot token not configured" },
        { status: 500 }
      );
    }

    const payload = await req.json();

    // Process the webhook and get the action
    const result = await processTelegramWebhook(payload, botToken);

    if (result) {
      console.log("Telegram webhook processed:", result);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing Telegram webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for the webhook
 */
export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Bot token not configured" },
        { status: 500 }
      );
    }

    const bot = getTelegramBotService();
    const botInfo = await bot.getMe();
    const webhookInfo = await bot.getWebhookInfo();

    return NextResponse.json({
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        is_bot: botInfo.is_bot,
      },
      webhook: webhookInfo,
    });
  } catch (error) {
    console.error("Error checking webhook status:", error);
    return NextResponse.json(
      { error: "Failed to get webhook info" },
      { status: 500 }
    );
  }
}
