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

    // Build date filter (use UTC to match database storage)
    const now = new Date();
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (dateFilter === "today") {
      dateFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
      dateTo = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
    } else if (dateFilter === "yesterday") {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      dateFrom = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
      dateTo = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59));
    } else if (dateFilter === "thisWeek") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      dateFrom = new Date(Date.UTC(d.getFullYear(), d.getMonth(), diff, 0, 0, 0));
      dateTo = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
    } else if (dateFilter === "thisMonth") {
      dateFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
      dateTo = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
    } else if (dateFilter === "lastMonth") {
      const lastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0));
      dateFrom = lastMonth;
      const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59));
      dateTo = lastDay;
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
