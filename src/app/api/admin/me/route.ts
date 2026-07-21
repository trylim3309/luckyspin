import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

    return NextResponse.json({
      admin: {
        id: session.id,
        name: session.name,
        fullName: session.fullName,
        role: session.role,
        permissions: session.permissions || [],
        teams: session.teams || ["KING88"],
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
