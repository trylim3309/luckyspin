"use client";

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
  Atom,
  FileText,
} from "lucide-react";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prizes", label: "Prizes", icon: Gift },
  { href: "/admin/conditions", label: "Conditions", icon: Settings },
  { href: "/admin/result-control", label: "Result Control", icon: Volume2 },
  { href: "/admin/settings", label: "Settings", icon: Atom },
  { href: "/admin/users", label: "Accounts", icon: FileText },
  { href: "/admin/admin-users", label: "Admin Users", icon: Users },
  { href: "/admin/spin-history", label: "Spin History", icon: History },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  adminLogoUrl?: string | null;
}

export function AdminSidebar({ collapsed, onCollapsedChange, adminLogoUrl }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      id="admin-sidebar"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: collapsed ? "76px" : "260px",
        background: "#1E1E2D",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        transition: "width 0.3s ease",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          height: "60px",
          display: "flex",
          alignItems: "center",
          padding: collapsed ? "0 16px" : "0 20px",
          borderBottom: "1px solid #333344",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <a
          href="/admin/dashboard"
          style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6D41D7 0%, #9B7CF4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {adminLogoUrl ? (
              <img
                src={adminLogoUrl}
                alt="Admin Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <span>🎰</span>
            )}
          </div>
          {!collapsed && (
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#FFB90F", whiteSpace: "nowrap" }}>
              Lucky Spin
            </span>
          )}
        </a>
      </div>

      {/* Menu Label */}
      {!collapsed && (
        <div style={{ padding: "20px 20px 8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Menu
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px" : "0 12px" }}>
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <a
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: collapsed ? "12px" : "10px 12px",
                marginBottom: "4px",
                borderRadius: "8px",
                textDecoration: "none",
                justifyContent: collapsed ? "center" : "flex-start",
                background: isActive ? "linear-gradient(135deg, #6D41D7 0%, #8B5CF4 100%)" : "transparent",
                color: isActive ? "#FFFFFF" : "#B4B7C5",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              <item.icon style={{ width: "20px", height: "20px", flexShrink: 0, pointerEvents: "none" }} />
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid #333344" }}>
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            border: "none",
            background: "transparent",
            color: "#B4B7C5",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            justifyContent: collapsed ? "center" : "flex-start",
            transition: "all 0.2s ease",
          }}
        >
          {collapsed ? (
            <ChevronRight style={{ width: "20px", height: "20px" }} />
          ) : (
            <>
              <ChevronLeft style={{ width: "20px", height: "20px" }} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      <style>{`
        #admin-sidebar .nav-item {
          transition: background 0.2s ease, color 0.2s ease;
        }
        #admin-sidebar .nav-item:hover {
          background: #2D2D3F !important;
          color: #FFFFFF !important;
        }
        #admin-sidebar .nav-item.active {
          box-shadow: 0 4px 12px rgba(109, 65, 215, 0.35);
        }
      `}</style>
    </aside>
  );
}