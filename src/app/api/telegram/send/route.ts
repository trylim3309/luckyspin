import { NextRequest, NextResponse } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram";
import { auth } from "@/lib/auth";

/**
 * Send a Telegram message to a specific user
 * POST /api/telegram/send
 * Body: { userId: string, message: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "userId and message are required" },
        { status: 400 }
      );
    }

    const success = await sendTelegramNotification(userId, message);

    if (success) {
      return NextResponse.json({ success: true, message: "Message sent" });
    } else {
      return NextResponse.json(
        { error: "Failed to send message. User may not have Telegram linked." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
