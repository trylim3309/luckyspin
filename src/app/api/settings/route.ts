import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.campaignSetting.findFirst({ where: { isActive: true } });
    return NextResponse.json({ wheelLogoUrl: settings?.wheelLogoUrl || null });
  } catch (error) {
    return NextResponse.json({ wheelLogoUrl: null });
  }
}
