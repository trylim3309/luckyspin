import { NextRequest, NextResponse } from "next/server";

// In-memory role permissions (in production, this could be stored in DB)
const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: ["prizes", "conditions", "result_control", "users", "spin_history", "promotions", "team", "settings", "customers"],
  ADMIN: ["prizes", "conditions", "result_control", "users", "spin_history", "promotions", "team", "settings", "customers"],
  AGENT: ["customers", "spin_history"],
  TEAM_LEADER: ["customers", "spin_history", "team"],
  MANAGER: ["prizes", "conditions", "spin_history", "promotions", "team", "customers"],
  VIEWER: ["spin_history"],
};

export async function GET() {
  return NextResponse.json({ roles: rolePermissions });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, permissions } = body;

    if (!role || !permissions) {
      return NextResponse.json({ error: "Role and permissions required" }, { status: 400 });
    }

    if (!rolePermissions[role]) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    rolePermissions[role] = permissions;

    return NextResponse.json({ success: true, role, permissions });
  } catch (error) {
    console.error("Role permissions update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
