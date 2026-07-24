import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Always clear admin_session cookie on logout
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  // Also clear spin session cookies if they exist
  response.cookies.set("spin_session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("spin_user_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  try {
    const { userId } = await request.json().catch(() => ({}));

    if (userId) {
      // Verify user exists and update online status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }).catch(() => null);

      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: { updatedAt: new Date(), isOnline: false },
        }).catch(() => {});
      }
    }
  } catch {
    // Ignore errors - we still want to clear cookies and redirect
  }

  return response;
}
