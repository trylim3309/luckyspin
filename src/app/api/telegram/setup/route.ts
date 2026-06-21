import { NextRequest, NextResponse } from "next/server";
import { getTelegramBotService } from "@/lib/telegram";
import { auth } from "@/lib/auth";

/**
 * Set up Telegram webhook URL
 * POST /api/telegram/setup
 * Body: { url: string } (optional, defaults to https://your-domain/api/telegram/webhook)
 *
 * This endpoint configures Telegram to send updates to your webhook URL.
 * Only accessible by authenticated admins.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot token not configured" },
        { status: 500 }
      );
    }

    const bot = getTelegramBotService();
    const body = await req.json();
    const { url } = body;

    // Get the base URL from the request or construct it
    const webhookUrl =
      url ||
      `${req.nextUrl.origin}/api/telegram/webhook`;

    const secretToken = process.env.TELEGRAM_BOT_SECRET;

    // Set the webhook
    const success = await bot.setWebhook(webhookUrl, secretToken);

    if (success) {
      // Verify the webhook was set correctly
      const webhookInfo = await bot.getWebhookInfo();

      return NextResponse.json({
        success: true,
        message: "Webhook configured successfully",
        webhookUrl,
        webhookInfo,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to set webhook" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error setting up Telegram webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get current webhook status
 * GET /api/telegram/setup
 */
export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot token not configured" },
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
      webhook: {
        url: webhookInfo.url || "Not configured",
        pending_updates: webhookInfo.pending_update_count,
      },
    });
  } catch (error) {
    console.error("Error getting webhook status:", error);
    return NextResponse.json(
      { error: "Failed to get webhook info" },
      { status: 500 }
    );
  }
}
