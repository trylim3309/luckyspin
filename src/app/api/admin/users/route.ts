import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { broadcast, REALTIME_EVENTS } from "@/lib/realtime";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const id = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const offset = (page - 1) * limit;

    // If fetching single user by ID
    if (id) {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { spinCondition: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const activeCondition = await prisma.spinCondition.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        user: {
          ...user,
          spinType: user.spinCondition?.spinType || activeCondition?.spinType || "FIXED",
        }
      });
    }

    const where = search
      ? (Prisma.validator<Prisma.UserWhereInput>()({
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }))
      : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch active condition, all daily spins, and all spin results in parallel
    const [users, total, dailySpins, allSpinResults, activeCondition] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { spinCondition: true },
      }),
      prisma.user.count({ where }),
      prisma.dailySpinCount.findMany({
        where: { date: today },
      }),
      prisma.spinResult.findMany({
        select: { userId: true },
      }),
      prisma.spinCondition.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const dailySpinMap = new Map(dailySpins.map(ds => [ds.userId, ds.spinCount]));

    // Count lifetime spins per user
    const lifetimeSpinMap = new Map<string, number>();
    for (const result of allSpinResults) {
      lifetimeSpinMap.set(result.userId, (lifetimeSpinMap.get(result.userId) || 0) + 1);
    }

    const usersWithSpinsLeft = users.map(user => {
      const dailyUsed = dailySpinMap.get(user.id) || 0;
      const lifetimeUsed = lifetimeSpinMap.get(user.id) || 0;
      let spinsLeft: number;

      if (!activeCondition || activeCondition.spinType === "FIXED") {
        // FIXED: spinsLeft = totalSpins (what admin deposited)
        spinsLeft = user.totalSpins;
      } else {
        // DAILY: maxSpinsPerDay resets each day, doesn't use user.totalSpins
        spinsLeft = Math.max(0, activeCondition.maxSpinsPerDay - dailyUsed);
      }

      return {
        ...user,
        spinsLeft,
        spinType: user.spinCondition?.spinType || activeCondition?.spinType || "FIXED",
        dailyUsed,
        lifetimeUsed,
      };
    });

    return NextResponse.json({ users: usersWithSpinsLeft, total, limit, offset });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.username || !body.password || !body.firstName) {
      return NextResponse.json(
        { error: "Username, password, and first name are required" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: body.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Check phone uniqueness if provided
    if (body.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: body.phone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number already exists" },
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName || null,
        phone: body.phone || null,
        email: body.email || null,
        balance: body.balance ?? 0,
      },
    });

    broadcast(REALTIME_EVENTS.USER_CREATED, user);
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        balance: user.balance,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Users POST error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Username or phone already exists" }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.username) updateData.username = body.username;
    if (body.firstName) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (typeof body.balance === "number") updateData.balance = body.balance;
    if (typeof body.isBlocked === "boolean") updateData.isBlocked = body.isBlocked;
    if (typeof body.totalSpins === "number") updateData.totalSpins = body.totalSpins;
    if (body.spinConditionId !== undefined) updateData.spinConditionId = body.spinConditionId;

    // If password is being updated, hash it
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: body.id },
      data: updateData,
    });

    // Record deposit/withdraw transaction
    if (body.transactionType && body.transactionAmount) {
      await prisma.spinTransaction.create({
        data: {
          userId: body.id,
          type: body.transactionType,
          amount: body.transactionAmount,
          note: body.note || null,
        },
      });
    }

    broadcast(REALTIME_EVENTS.USER_UPDATED, user);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        balance: user.balance,
        isBlocked: user.isBlocked,
        totalSpins: user.totalSpins,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Users PUT error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Delete related records first
    await prisma.spinTransaction.deleteMany({ where: { userId: id } });
    await prisma.dailySpinCount.deleteMany({ where: { userId: id } });
    await prisma.spinResult.deleteMany({ where: { userId: id } });

    // Delete the user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}