import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const adminSession = req.cookies.get("admin_session");
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(Buffer.from(adminSession.value, "base64").toString());
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (session.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const team = (formData.get("team") as string) || session.teams?.[0] || "KING88";
    const createdAt = formData.get("createdAt") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    }

    // Parse header row
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());

    // Find column indices
    const accountIdIdx = headers.findIndex(h => h.includes("account") || h.includes("id"));
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("phone"));
    const callStatusIdx = headers.findIndex(h => h.includes("call") || h.includes("chat"));
    const telegramIdx = headers.findIndex(h => h.includes("telegram") || h.includes("tg"));
    const actionIdx = headers.findIndex(h => h.includes("action"));
    const resultIdx = headers.findIndex(h => h.includes("result"));
    const typeIdx = headers.findIndex(h => h.includes("type"));
    const priorityIdx = headers.findIndex(h => h.includes("priority") || h.includes("prior"));
    const remarksIdx = headers.findIndex(h => h.includes("remark") || h.includes("note"));
    const teamIdx = headers.findIndex(h => h.includes("team"));

    if (accountIdIdx === -1) {
      return NextResponse.json({ error: "Account ID column not found" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.trim().replace(/"/g, ""));

      const accountId = values[accountIdIdx];
      if (!accountId) continue;

      // Check if already exists
      const existing = await prisma.oldCustomer.findUnique({
        where: { accountId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const name = nameIdx !== -1 ? values[nameIdx] || "Unknown" : "Unknown";
      const phone = phoneIdx !== -1 ? values[phoneIdx] || null : null;

      let callStatus = "NOT_CONTACTED";
      if (callStatusIdx !== -1) {
        const val = values[callStatusIdx].toLowerCase();
        if (val.includes("chat")) callStatus = "CHATTED";
        else if (val.includes("call")) callStatus = "CALLED";
      }

      const telegramId = telegramIdx !== -1 ? values[telegramIdx] || null : null;

      let action = "CHATTED_SUCCESS";
      if (actionIdx !== -1) {
        const val = values[actionIdx].toLowerCase();
        if (val.includes("ឆាតរួច")) action = "CHATTED_SUCCESS";
        else if (val.includes("អត់ឆាត")) action = "CHATTED_FAILED";
        else if (val.includes("ស្ពាម")) action = "SPAM";
        else if (val.includes("ប្លុក")) action = "BLOCKED";
      }

      let result = "NOT_PLAYED_YET";
      if (resultIdx !== -1) {
        const val = values[resultIdx].toLowerCase();
        if (val.includes("ធម្មតា")) result = "REGULAR_PLAYER";
        else if (val.includes("ប្រចាំ")) result = "FREQUENT_PLAYER";
        else if (val.includes("វិញ")) result = "RETURNED_PLAYER";
        else if (val.includes("អត់ទាន់")) result = "NOT_PLAYED_YET";
      }

      let type = "SMALL";
      if (typeIdx !== -1) {
        const val = values[typeIdx].toLowerCase();
        if (val.includes("ធំ")) type = "BIG";
        else if (val.includes("អត់ធ្លាប់")) type = "NEVER_PLAYED";
        else if (val.includes("បើក")) type = "ACCOUNT_OPEN_NO_DEPOSIT";
        else if (val.includes("តូច")) type = "SMALL";
      }

      let priority = "OCCASIONAL";
      if (priorityIdx !== -1) {
        const val = values[priorityIdx].toLowerCase();
        if (val.includes("លេងជាប្រចាំ")) priority = "FREQUENT";
        else if (val.includes("យូៗ")) priority = "OCCASIONAL";
        else if (val.includes("ខាន")) priority = "LAPSED";
      }

      const remarks = remarksIdx !== -1 ? values[remarksIdx] || null : null;

      let customerTeam = team;
      if (teamIdx !== -1) {
        const val = values[teamIdx].toUpperCase();
        if (val.includes("KING88")) customerTeam = "KING88";
        else if (val.includes("SKY24")) customerTeam = "SKY24";
        else if (val.includes("B88")) customerTeam = "B88";
      }

      try {
        await prisma.oldCustomer.create({
          data: {
            accountId,
            name,
            phone,
            callStatus: callStatus as any,
            telegramId,
            action: action as any,
            result: result as any,
            type: type as any,
            priority: priority as any,
            remarks,
            team: customerTeam as any,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
          },
        });
        imported++;
      } catch (e) {
        console.error(`Failed to import row ${i}:`, e);
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped, total: lines.length - 1 });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
