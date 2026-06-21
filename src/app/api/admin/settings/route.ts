import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast, REALTIME_EVENTS } from "@/lib/realtime";

function getAdminFromSession(req: NextRequest) {
  const adminSession = req.cookies.get("admin_session");
  if (!adminSession) return null;

  try {
    return JSON.parse(Buffer.from(adminSession.value, "base64").toString());
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    let settings = await prisma.campaignSetting.findFirst({ where: { isActive: true } });

    // Auto-create settings if none exist
    if (!settings) {
      settings = await prisma.campaignSetting.create({
        data: { name: "default", isActive: true },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getAdminFromSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, wheelLogoUrl, adminLogoUrl, ...rest } = body;

    if (id) {
      const updated = await prisma.campaignSetting.update({
        where: { id },
        data: { wheelLogoUrl, adminLogoUrl, ...rest },
      });
      broadcast(REALTIME_EVENTS.SETTINGS_UPDATED, updated);
      return NextResponse.json({ settings: updated });
    }

    // Create new if no id — try to find existing inactive one first
    const existing = await prisma.campaignSetting.findFirst();
    if (existing) {
      const updated = await prisma.campaignSetting.update({
        where: { id: existing.id },
        data: { wheelLogoUrl, adminLogoUrl, isActive: true, ...rest },
      });
      broadcast(REALTIME_EVENTS.SETTINGS_UPDATED, updated);
      return NextResponse.json({ settings: updated });
    }

    const created = await prisma.campaignSetting.create({
      data: { name: "default", isActive: true, wheelLogoUrl, adminLogoUrl, ...rest },
    });
    broadcast(REALTIME_EVENTS.SETTINGS_UPDATED, created);
    return NextResponse.json({ settings: created });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
