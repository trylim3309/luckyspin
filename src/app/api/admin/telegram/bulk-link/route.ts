import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Bulk import Telegram links for users
 * POST /api/admin/telegram/bulk-link
 * Body: {
 *   users: Array<{ username: string, telegramChatId: string }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { users } = body;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: "users array is required" },
        { status: 400 }
      );
    }

    const results = {
      linked: 0,
      notFound: [] as string[],
      errors: [] as { username: string; error: string }[],
    };

    for (const userData of users) {
      try {
        const { username, telegramChatId } = userData;

        if (!username || !telegramChatId) {
          results.errors.push({
            username: username || "unknown",
            error: "Missing username or telegramChatId",
          });
          continue;
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          results.notFound.push(username);
          continue;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: String(telegramChatId),
            telegramUsername: userData.telegramUsername || null,
          },
        });

        results.linked++;
      } catch (error) {
        results.errors.push({
          username: userData.username,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: users.length,
    });
  } catch (error) {
    console.error("Bulk link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
