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

      // Get selected sheet from formData, or use first sheet
      const selectedSheet = formData.get("sheet") as string || sheetNames[0];

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

    if (lines.length < 2) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h: string) => h.trim().toLowerCase());

    // Simple CSV line parser
    const parseCSVLine = (line: string): string[] => {
      return line.split(",").map((v: string) => v.trim());
    };

    // Find column indices
    const accountIdIdx = headers.findIndex(h => h.includes("account") || h.includes("id") || h === "acc");
    if (accountIdIdx === -1) {
      return NextResponse.json({ error: "Account ID column not found. Found: " + headers.join(", ") }, { status: 400 });
    }

    const nameIdx = headers.findIndex(h => h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("tel"));
    const callStatusIdx = headers.findIndex(h => h.includes("call") || h.includes("chat"));
    const telegramIdx = headers.findIndex(h => h.includes("telegram") || h.includes("tg"));
    const actionIdx = headers.findIndex(h => h.includes("action"));
    const resultIdx = headers.findIndex(h => h.includes("result"));
    const typeIdx = headers.findIndex(h => h.includes("type"));
    const priorityIdx = headers.findIndex(h => h.includes("priority") || h.includes("prior"));
    const remarksIdx = headers.findIndex(h => h.includes("remark") || h.includes("note"));
    const teamIdx = headers.findIndex(h => h.includes("team"));

    // Get default team from formData
    const team = (formData.get("team") as string) || session.teams?.[0] || "KING88";
    const createdAtParam = formData.get("createdAt") as string | null;
    const createdAt = createdAtParam ? new Date(createdAtParam + "T12:00:00.000Z") : new Date();

    // Parse date for duplicate check (using the date string directly, stored as UTC noon)
    const checkDate = createdAtParam || new Date().toISOString().split("T")[0];
    const [year, month, day] = checkDate.split("-").map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Fetch existing customers for the same day to check for duplicates by accountId
    const existingCustomers = await prisma.oldCustomer.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { accountId: true },
    });

    // Build a set of accountIds for quick lookup
    const existingAccountIds = new Set<string>();
    for (const c of existingCustomers) {
      const accountIdKey = c.accountId?.toUpperCase().trim() || "";
      if (accountIdKey) existingAccountIds.add(accountIdKey);
    }

    // Fetch telegram contacts for lookup
    const telegramContacts = await prisma.telegramContact.findMany();

    const findTelegramId = (telegramValue: string | null): string | null => {
      if (!telegramValue) return null;
      const search = telegramValue.toLowerCase().trim();
      if (!search) return null;
      const found = telegramContacts.find(
        (c) =>
          c.name.toLowerCase() === search ||
          c.username?.toLowerCase() === search ||
          c.phone === search
      );
      return found?.id || null;
    };

    const customersToCreate: any[] = [];
    let processedRows = 0;

    // Process data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const accountId = (values[accountIdIdx] || "").toUpperCase().trim();

        if (!accountId) {
          skipped++;
          continue;
        }

        // Check for duplicate accountId (same day)
        if (existingAccountIds.has(accountId)) {
          skipped++;
          continue;
        }
        processedRows++;
        existingAccountIds.add(accountId); // Prevent duplicates within same import

        const name = nameIdx !== -1 && values[nameIdx] ? values[nameIdx] : "Unknown";
        const phone = phoneIdx !== -1 && values[phoneIdx] ? values[phoneIdx] : null;

        // Map callStatus
        let callStatus = "NOT_CONTACTED";
        if (callStatusIdx !== -1 && values[callStatusIdx]) {
          const val = values[callStatusIdx].toLowerCase();
          if (val.includes("chat")) callStatus = "CHATTED";
          else if (val.includes("call")) callStatus = "CALLED";
          else if (val.includes("no answer")) callStatus = "NO_ANSWER";
          else if (val.includes("not interested")) callStatus = "NOT_INTERESTED";
        }

        const telegramValue = telegramIdx !== -1 && values[telegramIdx] ? values[telegramIdx] : null;
        const telegramId = findTelegramId(telegramValue);

        // Map action - use null so DB default is used
        let action: string | undefined = undefined;
        if (actionIdx !== -1 && values[actionIdx]) {
          const val = values[actionIdx].toLowerCase();
          if (val.includes("ឆាតរួច")) action = "CHATTED_SUCCESS";
          else if (val.includes("អត់ឆាត")) action = "CHATTED_FAILED";
          else if (val.includes("ស្ពាម")) action = "SPAM";
          else if (val.includes("ប្លុក")) action = "BLOCKED";
        }

        // Map result
        let result = "NOT_PLAYED_YET";
        if (resultIdx !== -1 && values[resultIdx]) {
          const val = values[resultIdx].toLowerCase();
          if (val.includes("ធម្មតា")) result = "REGULAR_PLAYER";
          else if (val.includes("វិញ")) result = "RETURNED_PLAYER";
          else if (val.includes("អត់ទាន់")) result = "NOT_PLAYED_YET";
        }

        // Map type
        let type = "SMALL";
        if (typeIdx !== -1 && values[typeIdx]) {
          const val = values[typeIdx].toLowerCase();
          if (val.includes("ធំ")) type = "BIG";
          else if (val.includes("អត់ធ្លាប់")) type = "NEVER_PLAYED";
          else if (val.includes("តូច")) type = "SMALL";
        }

        // Map priority
        let priority = "OCCASIONAL";
        if (priorityIdx !== -1 && values[priorityIdx]) {
          const val = values[priorityIdx].toLowerCase();
          if (val.includes("លេងជាប្រចាំ")) priority = "FREQUENT";
          else if (val.includes("ខាន")) priority = "LAPSED";
          else if (val.includes("យូៗ")) priority = "OCCASIONAL";
        }

        const remarks = remarksIdx !== -1 && values[remarksIdx] ? values[remarksIdx] : null;

        // Map team
        let customerTeam = team;
        if (teamIdx !== -1 && values[teamIdx]) {
          const val = values[teamIdx].toUpperCase();
          if (val.includes("KING88")) customerTeam = "KING88";
          else if (val.includes("SKY24")) customerTeam = "SKY24";
          else if (val.includes("B88")) customerTeam = "B88";
        }

        // Build data object - only include action if defined (DB will use default)
        const data: any = {
          accountId,
          name,
          phone,
          callStatus: callStatus as any,
          telegramId,
          result: result as any,
          type: type as any,
          priority: priority as any,
          remarks,
          team: customerTeam as any,
          createdAt,
        };
        if (action) data.action = action;

        // Add to batch and mark as seen
        customersToCreate.push(data);
      } catch (err) {
        console.error(`Row ${i} error:`, err instanceof Error ? err.message : err);
        errors.push(`Row ${i}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // Batch insert all customers at once
    if (customersToCreate.length > 0) {
      try {
        await prisma.oldCustomer.createMany({
          data: customersToCreate,
          skipDuplicates: true,
        });
        imported = customersToCreate.length;
      } catch (err) {
        console.error("Batch insert error:", err instanceof Error ? err.message : err);
        throw err;
      }
    }

    return NextResponse.json({
      imported: customersToCreate.length,
      skipped,
      total: lines.length - 1,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to import: " + message }, { status: 500 });
  }
}
