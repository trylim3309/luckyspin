import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

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
    let content: string;
    let lines: string[];
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // Parse Excel file
      const workbook = XLSX.read(new Uint8Array(bytes), { type: "array" });
      const sheetNames = workbook.SheetNames;
      console.log("Sheet names found:", sheetNames);

      // Get selected sheet from formData, or use first sheet
      const selectedSheet = formData.get("sheet") as string || sheetNames[0];
      console.log("Selected sheet:", selectedSheet);

      if (!sheetNames.includes(selectedSheet)) {
        return NextResponse.json({ error: `Sheet "${selectedSheet}" not found. Available sheets: ${sheetNames.join(", ")}` }, { status: 400 });
      }

      const worksheet = workbook.Sheets[selectedSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      lines = jsonData.map((row) => row.join(","));
    } else {
      // Parse CSV file
      content = new TextDecoder("utf-8").decode(bytes);
      lines = content.split("\n").filter((line) => line.trim());
    }
    console.log("Import debug - total lines:", lines.length, "first line:", lines[0]);

    if (lines.length < 2) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    }

    // Parse header (first line)
    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h: string) => h.trim().toLowerCase());
    console.log("Raw header line:", headerLine);
    console.log("Headers found:", headers);

    // Simple CSV line parser
    const parseCSVLine = (line: string): string[] => {
      return line.split(",").map((v: string) => v.trim());
    };

    // Find column indices
    const nameIdx = headers.findIndex(h => h.includes("name"));
    console.log("nameIdx:", nameIdx, "(must be >= 0)");
    if (nameIdx === -1) {
      console.log("ERROR: No 'name' column found. Headers:", headers);
      return NextResponse.json({ error: "CSV must have a 'name' column. Found: " + headers.join(", ") }, { status: 400 });
    }

    // Find other column indices
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("tel"));
    const accountIdIdx = headers.findIndex(h => h.includes("account") || h.includes("id"));
    const callStatusIdx = headers.findIndex(h => h.includes("call") || h.includes("chat"));
    const resultIdx = headers.findIndex(h => h.includes("result"));
    const telegramIdx = headers.findIndex(h => h.includes("telegram"));
    const remarksIdx = headers.findIndex(h => h.includes("remark"));
    console.log("phoneIdx:", phoneIdx, "accountIdIdx:", accountIdIdx, "callStatusIdx:", callStatusIdx, "resultIdx:", resultIdx, "telegramIdx:", telegramIdx, "remarksIdx:", remarksIdx);

    // Map result values
    const mapResult = (val: string): string => {
      if (!val) return "NOT_CREATED";
      const upper = val.toUpperCase();
      if (upper.includes("DEPOSIT") || upper.includes("ដាក់លុយ")) return "DEPOSIT";
      if (upper.includes("NOT_DEPOSIT") || upper.includes("អត់តប") || upper.includes("NOT ដាក់")) return "NOT_DEPOSIT";
      return "NOT_CREATED";
    };

    // Map callStatus values
    const mapCallStatus = (val: string): string => {
      if (!val) return "CHATTED";
      const upper = val.toUpperCase();
      if (upper.includes("CALLED") || upper.includes("CALL")) return "CALLED";
      if (upper.includes("CHAT") || upper.includes("CHATTED")) return "CHATTED";
      return "CHATTED";
    };

    // Fetch telegram contacts for lookup
    const telegramContacts = await prisma.telegramContact.findMany();
    console.log("Telegram contacts found:", telegramContacts.length, telegramContacts);

    const findTelegramId = (telegramValue: string | null): string | null => {
      if (!telegramValue) return null;
      const search = telegramValue.toLowerCase().trim();
      if (!search) return null;
      // Try to match by name, username, or phone
      const found = telegramContacts.find(
        (c) =>
          c.name.toLowerCase() === search ||
          c.username?.toLowerCase() === search ||
          c.phone === search
      );
      console.log(`findTelegramId("${telegramValue}") -> search="${search}", found=`, found);
      return found?.id || null;
    };

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get agent's team for default
    const agentId = formData.get("agentId") as string || session.id;
    const agent = await prisma.adminUser.findUnique({
      where: { id: agentId },
      select: { teams: true },
    });

    // Get createdAt date from formData (defaults to now)
    const createdAtParam = formData.get("createdAt") as string | null;
    const createdAt = createdAtParam
      ? new Date(createdAtParam + "T12:00:00.000Z")
      : new Date();

    // Process data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        console.log(`Row ${i}: raw="${lines[i]}"`, "parsed=", values);
        const name = values[nameIdx] || "";
        console.log(`Row ${i}: name="${name}"`);
        if (!name) continue;

        const phone = phoneIdx !== -1 ? values[phoneIdx] || null : null;
        const accountId = accountIdIdx !== -1 ? (values[accountIdIdx] || null)?.toUpperCase() : null;
        const callStatus = callStatusIdx !== -1 ? mapCallStatus(values[callStatusIdx]) : "CHATTED";
        const result = resultIdx !== -1 ? mapResult(values[resultIdx]) : "NOT_CREATED";
        const remarks = remarksIdx !== -1 ? values[remarksIdx] || null : null;
        const telegramValue = telegramIdx !== -1 ? values[telegramIdx] || null : null;
        const telegramId = findTelegramId(telegramValue);

        console.log(`Creating: name="${name}", phone="${phone}", accountId="${accountId}", callStatus="${callStatus}", result="${result}", telegramId="${telegramId}", remarks="${remarks}"`);

        await prisma.customer.create({
          data: {
            name,
            phone: phone || null,
            accountId: accountId || null,
            callStatus: callStatus as any,
            result: result as any,
            agentId: agentId,
            team: agent?.teams?.[0] || "KING88",
            createdAt: createdAt,
            remarks: remarks,
            telegramId: telegramId,
          },
        });
        imported++;
      } catch (err) {
        console.error(`Row ${i} error:`, err instanceof Error ? err.message : err);
        // If it's a unique constraint error, skip this row (duplicate accountId)
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          skipped++;
          errors.push(`Row ${i}: Duplicate accountId skipped`);
        } else {
          errors.push(`Row ${i}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: lines.length - 1,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to import customers: " + message }, { status: 500 });
  }
}
