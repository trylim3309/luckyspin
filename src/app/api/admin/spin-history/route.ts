import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const isWin = searchParams.get("isWin");
    const resultSource = searchParams.get("resultSource");

    const where: Record<string, unknown> = {};

    if (search) {
      where.user = {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    if (userId) {
      where.userId = userId;
    }

    if (isWin !== null && isWin !== undefined) {
      where.isWin = isWin === "true";
    }

    if (resultSource) {
      where.resultSource = resultSource;
    }

    const [history, total] = await Promise.all([
      prisma.spinResult.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
              firstName: true,
            },
          },
          prize: {
            select: {
              name: true,
              type: true,
              value: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.spinResult.count({ where }),
    ]);

    return NextResponse.json({ history, total, limit, offset });
  } catch (error) {
    console.error("SpinHistory GET error:", error);
    return NextResponse.json({ error: "Failed to fetch spin history" }, { status: 500 });
  }
}