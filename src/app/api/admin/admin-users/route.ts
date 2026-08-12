import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const team = searchParams.get("team");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: any = search
      ? {
          name: { contains: search },
        }
      : {};

    if (team && team !== "all") {
      where.teams = { has: team };
    }

    // Filter by isActive status
    if (searchParams.get("isActive") === "true") {
      where.isActive = true;
    } else if (searchParams.get("isActive") === "false") {
      where.isActive = false;
    }

    const [users, total] = await Promise.all([
      prisma.adminUser.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.adminUser.count({ where }),
    ]);

    // Ensure isActive defaults to true for users without this field (existing users)
    const usersWithDefaults = users.map(u => ({
      ...u,
      isActive: u.isActive ?? true,
    }));

    return NextResponse.json({ users: usersWithDefaults, total, limit, offset });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.password) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.adminUser.findFirst({
      where: { username: body.name.toLowerCase().replace(/\s+/g, "") },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.adminUser.create({
      data: {
        name: body.name,
        fullName: body.fullName || null,
        username: body.name.toLowerCase().replace(/\s+/g, ""),
        email: body.name.toLowerCase().replace(/\s+/g, "") + "@admin.local",
        passwordHash,
        role: body.role || "ADMIN",
        permissions: body.permissions || [],
        teams: body.teams || ["KING88"],
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        teams: user.teams,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin users POST error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create user: " + message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("PUT body:", JSON.stringify(body));

    if (!body.id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name) {
      const currentUser = await prisma.adminUser.findUnique({ where: { id: body.id } });
      console.log("currentUser from DB:", currentUser?.id, "username:", currentUser?.username);
      const newUsername = body.name.toLowerCase().replace(/\s+/g, "");

      // Only check for duplicates and update username if name actually changed
      if (currentUser && currentUser.username !== newUsername) {
        const existingUser = await prisma.adminUser.findFirst({
          where: {
            username: newUsername,
            NOT: { id: body.id },
          },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "Username already exists" },
            { status: 409 }
          );
        }

        updateData.username = newUsername;
      }

      if (currentUser && currentUser.name !== body.name) {
        updateData.name = body.name;
      }
    }
    if (body.fullName !== undefined) updateData.fullName = body.fullName || null;
    if (body.role) updateData.role = body.role;
    if (body.permissions) updateData.permissions = body.permissions;
    if (body.teams) updateData.teams = body.teams;
    if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
    console.log("updateData before password:", JSON.stringify(updateData));

    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }

    console.log("Attempting prisma update with data:", JSON.stringify(updateData));
    const user = await prisma.adminUser.update({
      where: { id: body.id },
      data: updateData,
    });

    console.log("PUT success, updated user:", user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        teams: user.teams,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin users PUT error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to update user: " + message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Check if user has customers
    const customerCount = await prisma.customer.count({ where: { agentId: id } });
    if (customerCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete user with ${customerCount} customers. Reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.adminUser.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin users DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}