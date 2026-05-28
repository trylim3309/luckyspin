import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where = search
      ? (Prisma.validator<Prisma.UserWhereInput>()({
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }))
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    // Get today's date for daily spin count calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get daily spin counts for all users
    const userIds = users.map(u => u.id);
    const dailySpins = await prisma.dailySpinCount.findMany({
      where: {
        userId: { in: userIds },
        date: today,
      },
    });

    // Create a map of userId -> spinCount
    const dailySpinMap = new Map(dailySpins.map(ds => [ds.userId, ds.spinCount]));

    // Add spinsLeft to each user
    const usersWithSpinsLeft = users.map(user => ({
      ...user,
      spinsLeft: user.totalSpins - (dailySpinMap.get(user.id) || 0),
    }));

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
    const passwordHash = await bcrypt.hash(body.password, 12);

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

    // If password is being updated, hash it
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: body.id },
      data: updateData,
    });

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

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}