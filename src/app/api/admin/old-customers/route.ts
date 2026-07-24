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
    const team = searchParams.get("team");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = (page - 1) * limit;

    // Get user's team from session
    const userTeams = session.teams || ["KING88"];
    const userTeam = userTeams[0];
    // Users with admin/manager roles can see all teams, others see only their team's data
    const canViewAllTeams = ["ADMIN", "SUPER_ADMIN", "MANAGER", "TEAM_LEADER"].includes(session.role);

    // Build date filter - use Cambodia timezone (UTC+7)
    const now = new Date();
    const utcDateStr = now.toISOString().slice(0, 10);
    const [utcYear, utcMonth, utcDay] = utcDateStr.split("-").map(Number);

    let cambodiaYear = utcYear;
    let cambodiaMonth = utcMonth;
    let cambodiaDay = utcDay;
    const utcHour = parseInt(now.toISOString().slice(11, 13), 10);
    if (utcHour + 7 >= 24) {
      cambodiaDay++;
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
      // Today = show all customers that need follow-up this month (failed contacts)
      // Follow-up customers where action="CHATTED_FAILED" and result="NOT_PLAYED_YET"
      // Filter by this month's followUpDate
      const monthStart = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, 1, 0, 0, 0));
      dateFrom = monthStart;
      dateTo = now;
    } else if (dateFilter === "yesterday") {
      const twoDaysAgo17 = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay - 2, 17, 0, 0));
      const yesterday17 = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay - 1, 17, 0, 0));
      dateFrom = twoDaysAgo17;
      dateTo = yesterday17;
    } else if (dateFilter === "thisWeek") {
      const dayOfWeek = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay)).getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday17 = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, cambodiaDay - daysToMonday, 17, 0, 0));
      dateFrom = monday17;
      dateTo = now;
    } else if (dateFilter === "thisMonth") {
      const monthStart17 = new Date(Date.UTC(cambodiaYear, cambodiaMonth - 1, 1, 17, 0, 0));
      dateFrom = monthStart17;
      dateTo = now;
    } else if (dateFilter === "lastMonth") {
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

    const where: Prisma.OldCustomerWhereInput = {};

    // Users with admin/manager roles can see all teams, others see only their team's data
    if (!canViewAllTeams) {
      where.team = userTeam as any;
    } else if (team && team !== "all") {
      where.team = team as any;
    }

    // Today filter: show follow-up needed this month (failed contacts)
    if (dateFilter === "today") {
      if (dateFrom && dateTo) {
        where.followUpDate = { gte: dateFrom, lte: dateTo };
      }
      where.action = "CHATTED_FAILED";
      where.result = "NOT_PLAYED_YET";
    } else if (dateFrom && dateTo) {
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
    if (searchParams.get("action") && searchParams.get("action") !== "all") {
      where.action = searchParams.get("action") as any;
    }
    if (searchParams.get("result") && searchParams.get("result") !== "all") {
      where.result = searchParams.get("result") as any;
    }
    if (searchParams.get("type") && searchParams.get("type") !== "all") {
      where.type = searchParams.get("type") as any;
    }
    if (searchParams.get("priority") && searchParams.get("priority") !== "all") {
      where.priority = searchParams.get("priority") as any;
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
      prisma.oldCustomer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.oldCustomer.count({ where }),
    ]);

    return NextResponse.json({ customers, total, page, limit });
  } catch (error) {
    console.error("Old Customers GET error:", error);
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

    if (!body.accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const customer = await prisma.oldCustomer.create({
      data: {
        accountId: body.accountId,
        name: body.name || "",
        phone: body.phone || null,
        callStatus: body.callStatus || "NOT_CONTACTED",
        telegramId: body.telegramId || null,
        action: body.action || "CHATTED_SUCCESS",
        lastPlayDate: body.lastPlayDate ? new Date(body.lastPlayDate) : null,
        result: body.result || "NOT_PLAYED_YET",
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        type: body.type || "SMALL",
        priority: body.priority || "OCCASIONAL",
        remarks: body.remarks || null,
        team: body.team || "KING88",
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Old Customers POST error:", error);
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

    const updateData: Record<string, unknown> = {};
    const allowed = ["accountId", "name", "phone", "callStatus", "telegramId", "action", "lastPlayDate", "result", "followUpDate", "type", "priority", "remarks", "team"];
    for (const field of allowed) {
      if (body[field] !== undefined) {
        if (field === "lastPlayDate" || field === "followUpDate") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (body.telegramId === null) {
      updateData.telegramId = null;
    }

    const updatedCustomer = await prisma.oldCustomer.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Old Customers PUT error:", error);
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

    await prisma.oldCustomer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Old Customers DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
