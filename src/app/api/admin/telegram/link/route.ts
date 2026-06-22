import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Bulk link pending Telegram users by username
 * POST /api/admin/telegram/link
 * Body: { usernames: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { usernames } = body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json(
        { error: "usernames array is required" },
        { status: 400 }
      );
    }

    const results = {
      linked: 0,
      notFound: [] as string[],
      noPendingLink: [] as string[],
      errors: [] as { username: string; error: string }[],
    };

    for (const username of usernames) {
      try {
        // Find user by username
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          results.notFound.push(username);
          continue;
        }

        // Find pending link by telegramUsername
        const pendingLink = await prisma.pendingTelegramLink.findFirst({
          where: {
            telegramUsername: username,
            linked: false,
          },
        });

        if (!pendingLink) {
          results.noPendingLink.push(username);
          continue;
        }

        // Link the user to the Telegram chatId
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: pendingLink.telegramChatId,
            telegramUsername: pendingLink.telegramUsername,
          },
        });

        // Mark pending link as linked
        await prisma.pendingTelegramLink.update({
          where: { id: pendingLink.id },
          data: {
            linked: true,
            linkedAt: new Date(),
            userId: user.id,
          },
        });

        results.linked++;
      } catch (error) {
        results.errors.push({
          username,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: usernames.length,
    });
  } catch (error) {
    console.error("Link users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
