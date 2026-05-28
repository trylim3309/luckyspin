import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

let prizesCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute cache

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (prizesCache && (now - prizesCache.timestamp) < CACHE_TTL) {
      return NextResponse.json(prizesCache.data, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }

    const prizes = await prisma.prize.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        color: true,
        value: true,
        type: true,
        stock: true,
        probability: true,
        displayOrder: true,
      },
    });

    prizesCache = { data: { prizes }, timestamp: now };

    return NextResponse.json({ prizes }, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    console.error("Prizes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch prizes" }, { status: 500 });
  }
}