"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gift,
  Settings,
  Volume2,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prizes", label: "Prizes", icon: Gift },
  { href: "/admin/conditions", label: "Conditions", icon: Settings },
  { href: "/admin/result-control", label: "Result Control", icon: Volume2 },
  { href: "/admin/settings", label: "Wheel Logo", icon: LayoutDashboard },
  { href: "/admin/users", label: "Accounts", icon: Users },
  { href: "/admin/admin-users", label: "Admin Users", icon: Users },
  { href: "/admin/spin-history", label: "Spin History", icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-40 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
              <span className="text-xl">🎰</span>
            </div>
            {!collapsed && <span className="font-bold text-lg">Lucky Spin</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isActive
                    ? "bg-yellow-500/20 text-yellow-400 border-r-4 border-yellow-500"
                    : "hover:bg-slate-700/50 text-slate-300 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-slate-700 hover:bg-slate-700/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 mx-auto" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        {/* Back to site */}
        <div className="p-4 border-t border-slate-700">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <span className="text-lg">←</span>
            {!collapsed && <span>Back to Site</span>}
          </Link>
        </div>
      </div>
    </aside>
  );
}