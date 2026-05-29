import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.campaignSetting.findFirst({ where: { isActive: true } });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, wheelLogoUrl, ...rest } = body;

    if (id) {
      const updated = await prisma.campaignSetting.update({
        where: { id },
        data: { wheelLogoUrl, ...rest },
      });
      return NextResponse.json({ settings: updated });
    }

    // Create if no id provided
    const created = await prisma.campaignSetting.create({
      data: { wheelLogoUrl, ...rest },
    });
    return NextResponse.json({ settings: created });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
