import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Helper: get admin session from cookie
function getAdminSession(req: NextRequest) {
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
    const session = getAdminSession(req);
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const dateFilter = searchParams.get("dateFilter") || "all";
    const agentId = searchParams.get("agentId");
    const team = searchParams.get("team");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = (page - 1) * limit;

    // Build date filter - use Cambodia timezone (UTC+7) via ISO string manipulation
    const now = new Date();
    // Get current UTC date string
    const utcDateStr = now.toISOString().slice(0, 10); // "2026-07-22" in UTC
    const [utcYear, utcMonth, utcDay] = utcDateStr.split("-").map(Number);

    // Calculate Cambodia date (UTC+7 = UTC + 7 hours, so add 7 to hour then handle overflow)
    let cambodiaYear = utcYear;
    let cambodiaMonth = utcMonth;
    let cambodiaDay = utcDay;
    const utcHour = parseInt(now.toISOString().slice(11, 13), 10);
    if (utcHour + 7 >= 24) {
      // Next day in Cambodia
      cambodiaDay++;
      // Handle month overflow
      const daysInMonth = new Date(Date.UTC(cambodiaYear, cambodiaMonth, 0)).getDate();
      if (cambodiaDay > daysInMonth) {
        cambodiaDay = 1;
        cambodiaMonth++;
        if (cambodiaMonth > 12) {
          cambodiaMonth = 1;
          cambodiaYear++;
        }
      }
    }

    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (dateFilter === "today") {
      // Today in Cambodia = from 17:00 UTC yesterday to 17:00 UTC today
      // (Cambodia midnight = UTC 17:00 of previous day)
      const yesterday17 = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, 17, 0, 0));
      const today17 = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay, 17, 0, 0));
      dateFrom = yesterday17;
      dateTo = today17;
    } else if (dateFilter === "yesterday") {
      // Yesterday in Cambodia = from 17:00 UTC two days ago to 17:00 UTC yesterday
      const twoDaysAgo17 = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay - 1, 17, 0, 0));
      const yesterday17 = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, 17, 0, 0));
      dateFrom = twoDaysAgo17;
      dateTo = yesterday17;
    } else if (dateFilter === "thisWeek") {
      // This week = Monday 17:00 UTC to now
      // Use UTC date for day of week (not adjusted cambodiaDay)
      // When UTC hour >= 17, cambodiaDay is tomorrow, so use dayOffset
      const dayOfWeek = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay)).getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayOffset = utcHour + 7 >= 24 ? 1 : 0;
      const monday17 = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay - daysToMonday - dayOffset, 17, 0, 0));
      dateFrom = monday17;
      dateTo = now;
    } else if (dateFilter === "thisMonth") {
      // This month = 17:00 UTC on 1st of month to now
      const monthStart17 = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, 1, 17, 0, 0));
      dateFrom = monthStart17;
      dateTo = now;
    } else if (dateFilter === "lastMonth") {
      // Last month = 17:00 UTC on 1st of last month to 17:00 UTC on 1st of this month
      let lmMonth = cambodiaMonth - 1;
      let lmYear = cambodiaYear;
      if (lmMonth < 1) {
        lmMonth = 12;
        lmYear--;
      }
      const lastMonthStart17 = new Date(Date.UTC(lmYear, lmMonth - 1, 1, 17, 0, 0));
      const thisMonthStart17 = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, 1, 17, 0, 0));
      dateFrom = lastMonthStart17;
      dateTo = thisMonthStart17;
    } else if (dateFilter === "custom") {
      const dateFromParam = searchParams.get("dateFrom");
      const dateToParam = searchParams.get("dateTo");
      if (dateFromParam) dateFrom = new Date(dateFromParam);
      if (dateToParam) dateTo = new Date(dateToParam + "T23:59:59");
    }

    const where: Prisma.CustomerWhereInput = {};

    // AGENT and TEAM_LEADER can only see their own customers
    // ADMIN, SUPER_ADMIN, and MANAGER can see all
    if (session.role === "AGENT" || session.role === "TEAM_LEADER") {
      where.agentId = session.id;
    } else {
      // Admin can filter by agent
      if (agentId && agentId !== "all") where.agentId = agentId;
    }

    // MANAGER, ADMIN, SUPER_ADMIN can filter by any team
    if (team && team !== "all") {
      where.team = team as any;
    }

    if (dateFrom && dateTo) {
      where.createdAt = { gte: dateFrom, lte: dateTo };
    }
    if (searchParams.get("telegramId") && searchParams.get("telegramId") !== "all") {
      where.telegramId = searchParams.get("telegramId");
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { accountId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (searchParams.get("callStatus") && searchParams.get("callStatus") !== "all") {
      where.callStatus = searchParams.get("callStatus") as any;
    }
    if (searchParams.get("result") && searchParams.get("result") !== "all") {
      where.result = searchParams.get("result") as any;
    }
    const remarksParam = searchParams.get("remarks");
    if (remarksParam && remarksParam !== "all") {
      if (remarksParam === "has_remarks") {
        where.remarks = { not: null };
      } else if (remarksParam === "no_remarks") {
        where.remarks = null;
      }
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { agent: { select: { id: true, name: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({ customers, total, page, limit });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Name is required but can be empty string (will be filled in spreadsheet)
    // We just check if the field exists
    if (!body.hasOwnProperty("name")) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get agent's teams for default
    const agent = await prisma.adminUser.findUnique({
      where: { id: session.id },
      select: { teams: true },
    });

    const customer = await prisma.customer.create({
      data: {
        accountId: body.accountId !== undefined && body.accountId !== "" ? body.accountId : null,
        name: body.name,
        phone: body.phone || null,
        callStatus: body.callStatus || "NOT_CONTACTED",
        result: body.result || "NOT_CREATED",
        telegramId: body.telegramId || null,
        remarks: body.remarks || null,
        agentId: session.id,
        team: body.team || agent?.teams?.[0] || "KING88",
      },
      include: { agent: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Customers POST error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    // Agents can only update their own customers
    if (session.role === "AGENT" || session.role === "TEAM_LEADER" || session.role === "MANAGER") {
      const customer = await prisma.customer.findUnique({ where: { id: body.id } });
      if (!customer || customer.agentId !== session.id) {
        return NextResponse.json({ error: "Cannot edit another agent's customer" }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    const allowed = ["name", "phone", "accountId", "callStatus", "result", "telegramId", "remarks", "team"];
    for (const field of allowed) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle telegramId removal
    if (body.telegramId === null) {
      updateData.telegramId = null;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: body.id },
      data: updateData,
      include: { agent: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Customers PUT error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    // Agents can only delete their own customers
    if (session.role === "AGENT" || session.role === "TEAM_LEADER" || session.role === "MANAGER") {
      const customer = await prisma.customer.findUnique({ where: { id } });
      if (!customer || customer.agentId !== session.id) {
        return NextResponse.json({ error: "Cannot delete another agent's customer" }, { status: 403 });
      }
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customers DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
