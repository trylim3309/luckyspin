import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prizes = await prisma.prize.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Prizes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch prizes" }, { status: 500 });
  }
}