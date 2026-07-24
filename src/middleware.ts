import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const adminSession = req.cookies.get("admin_session");
  const { pathname } = req.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/admin/login", "/api/auth/login", "/login"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // If accessing admin route without session, redirect to login
  if (!adminSession && pathname.startsWith("/admin") && !isPublicPath) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // If already logged in and trying to access login, redirect to dashboard
  if (adminSession && pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
