import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Create settings record if doesn't exist
    const existing = await prisma.campaignSetting.findFirst();
    if (!existing) {
      await prisma.campaignSetting.create({
        data: { name: "default", isActive: true },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      // Already exists, that's fine
      return NextResponse.json({ ok: true, note: "already exists" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
