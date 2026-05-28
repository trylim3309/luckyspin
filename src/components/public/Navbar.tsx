"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

interface NavbarProps {
  user?: {
    firstName: string;
    photoUrl?: string;
  } | null;
  onLogout?: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <span className="font-bold text-xl">Lucky Spin</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={`hover:text-yellow-400 transition-colors ${
                pathname === "/" ? "text-yellow-400" : ""
              }`}
            >
              Home
            </Link>

            {user ? (
              <>
                <Link
                  href="/spin"
                  className={`hover:text-yellow-400 transition-colors ${
                    pathname === "/spin" ? "text-yellow-400" : ""
                  }`}
                >
                  Spin
                </Link>

                <div className="flex items-center gap-3">
                  {user.photoUrl && (
                    <img
                      src={user.photoUrl}
                      alt={user.firstName}
                      className="w-8 h-8 rounded-full border-2 border-yellow-400"
                    />
                  )}
                  <span className="font-medium">{user.firstName}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLogout}
                    className="border-white/30 text-white hover:bg-white/20"
                  >
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                  Login with Telegram
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}