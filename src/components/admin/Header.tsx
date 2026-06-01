"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

interface AdminUser {
  id: string;
  name: string;
  role: string;
}

interface AdminHeaderProps {
  user: AdminUser | null;
  sidebarCollapsed: boolean;
}

export function AdminHeader({ user, sidebarCollapsed }: AdminHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    }
  };

  return (
    <header className={`fixed top-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 transition-all duration-300 ${sidebarCollapsed ? "left-16" : "left-64"}`}>
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-700">Admin Panel</h2>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="text-left">
            <p className="font-medium text-slate-900">{user?.name || "Admin"}</p>
            <p className="text-xs text-slate-500">{user?.role || "ADMIN"}</p>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}