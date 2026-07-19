import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getAdminSession(req: NextRequest) {
  const adminSession = req.cookies.get("admin_session");
  if (!adminSession) return null;
  try {
    return JSON.parse(Buffer.from(adminSession.value, "base64").toString());
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse CSV or Excel (simple CSV parsing for now)
    const content = buffer.toString("utf-8");
    const lines = content.split("\n").filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    }

    // Parse header (first line)
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    // Find column indices
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("tel"));
    const accountIdIdx = headers.findIndex(h => h.includes("account") || h.includes("id"));

    if (nameIdx === -1) {
      return NextResponse.json({ error: "CSV must have a 'name' column" }, { status: 400 });
    }

    let imported = 0;
    const errors: string[] = [];

    // Get agent's team for default
    const agent = await prisma.adminUser.findUnique({
      where: { id: session.id },
      select: { team: true },
    });

    // Process data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map(v => v.trim());
        const name = values[nameIdx] || "";

        if (!name) continue;

        const phone = phoneIdx !== -1 ? values[phoneIdx] || null : null;
        const accountId = accountIdIdx !== -1 ? values[accountIdIdx] || null : null;

        await prisma.customer.create({
          data: {
            name,
            phone: phone || null,
            accountId: accountId || null,
            callStatus: "NOT_CONTACTED",
            result: "NEW",
            agentId: session.id,
            team: agent?.team || "KING88",
          },
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${i}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      imported,
      total: lines.length - 1,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Failed to import customers" }, { status: 500 });
  }
}
