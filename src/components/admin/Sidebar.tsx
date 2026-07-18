"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  X,
  Tag,
  Handshake,
  UserPlus,
  UserCheck,
  MessageSquare,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

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
  hidden: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onHiddenChange: (hidden: boolean) => void;
  adminLogoUrl?: string | null;
  permissions?: string[];
  role?: string;
}

const permissionMap: Record<string, string[]> = {
  prizes: ["/admin/prizes"],
  conditions: ["/admin/conditions"],
  result_control: ["/admin/result-control"],
  users: ["/admin/users", "/admin/spin-history", "/admin/customers"],
  spin_history: ["/admin/spin-history"],
  promotions: ["/admin/promotions"],
  team: ["/admin/team"],
  settings: ["/admin/settings", "/admin/admin-users", "/admin/roles", "/admin/telegram", "/admin/telegram/contacts"],
  customers: ["/admin/customers/new", "/admin/customers/old"],
  telegram: ["/admin/telegram", "/admin/telegram/contacts"],
};

export function AdminSidebar({ collapsed, hidden, onCollapsedChange, onHiddenChange, adminLogoUrl, permissions, role }: AdminSidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [spinMgmtOpen, setSpinMgmtOpen] = useState(true);
  const [settingOpen, setSettingOpen] = useState(true);
  const [marketingOpen, setMarketingOpen] = useState(true);
  const [customersOpen, setCustomersOpen] = useState(true);

  const navItems = [
    { href: "/admin/dashboard", label: t("common.dashboard"), icon: LayoutDashboard },
    { href: "/admin/prizes", label: t("common.prizes"), icon: Gift },
    { href: "/admin/conditions", label: t("common.conditions"), icon: Settings },
    { href: "/admin/result-control", label: t("common.resultControl"), icon: Volume2 },
    { href: "/admin/users", label: t("common.accounts"), icon: FileText },
    { href: "/admin/spin-history", label: t("common.spinHistory"), icon: History },
    { href: "/admin/settings", label: t("common.settings"), icon: Atom },
    { href: "/admin/admin-users", label: t("common.adminUsers"), icon: Users },
    { href: "/admin/team", label: t("common.team"), icon: Handshake },
    { href: "/admin/promotions", label: t("common.promotions"), icon: Tag },
    { href: "/admin/telegram", label: t("common.telegram"), icon: MessageSquare },
    { href: "/admin/telegram/contacts", label: t("common.telegramContacts"), icon: UserCheck },
    { href: "/admin/customers/new", label: t("common.newCustomers"), icon: UserPlus },
    { href: "/admin/customers/old", label: t("common.oldCustomers"), icon: UserCheck },
    { href: "/admin/roles", label: t("common.roles"), icon: Shield },
  ];

  const spinManagementItems = navItems.filter(item =>
    ["/admin/prizes", "/admin/conditions", "/admin/result-control", "/admin/users", "/admin/spin-history"].includes(item.href)
  );

  const settingItems = navItems.filter(item =>
    ["/admin/settings", "/admin/admin-users", "/admin/roles", "/admin/team", "/admin/telegram", "/admin/telegram/contacts"].includes(item.href)
  );

  const marketingItems = navItems.filter(item =>
    ["/admin/promotions"].includes(item.href)
  );

  const customerItems = navItems.filter(item =>
    ["/admin/customers/new", "/admin/customers/old"].includes(item.href)
  );

  // Filter nav items based on permissions
  const canAccess = (href: string): boolean => {
    // SUPER_ADMIN or no permissions = full access
    if (role === "SUPER_ADMIN" || !permissions || permissions.length === 0) {
      return true;
    }
    // Check if any permission grants access to this href
    return permissions.some(perm => {
      const allowedPaths = permissionMap[perm];
      return allowedPaths && allowedPaths.some(path => href.startsWith(path));
    });
  };

  const filteredNavItems = navItems.filter(item => canAccess(item.href));
  const filteredSpinManagementItems = spinManagementItems.filter(item => canAccess(item.href));
  const filteredSettingItems = settingItems.filter(item => canAccess(item.href));
  const filteredMarketingItems = marketingItems.filter(item => canAccess(item.href));
  const filteredCustomerItems = customerItems.filter(item => canAccess(item.href));

  // Check screen size
  useEffect(() => {
    const checkScreen = () => setIsSmallScreen(window.innerWidth < 1024);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Click outside to close sidebar on mobile
  useEffect(() => {
    if (!hidden && isSmallScreen) {
      const handleClickOutside = (e: MouseEvent) => {
        const sidebar = document.getElementById("admin-sidebar");
        const toggleBtn = document.getElementById("sidebar-toggle-btn");
        if (sidebar && !sidebar.contains(e.target as Node) && !toggleBtn?.contains(e.target as Node)) {
          onHiddenChange(true);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [hidden, onHiddenChange, isSmallScreen]);

  if (hidden) return null;

  return (
    <>
      {/* Overlay - only on small screens */}
      {isSmallScreen && (
        <div
          onClick={() => onHiddenChange(true)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 99,
          }}
        />
      )}
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
          transition: "width 0.3s ease, transform 0.3s ease",
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
          justifyContent: collapsed ? "center" : "space-between",
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
              CUS System
            </span>
          )}
        </a>
        {collapsed && (
          <button
            onClick={() => onHiddenChange(true)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X style={{ width: "20px", height: "20px", color: "#B4B7C5" }} />
          </button>
        )}
      </div>

      {/* Menu Label */}
      {!collapsed && (
        <div style={{ padding: "20px 20px 8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {t("common.menu") || "Menu"}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px" : "0 12px" }}>
        {/* Dashboard always visible */}
        {navItems.filter(item => item.href === "/admin/dashboard").map((item) => {
          const isActive = pathname === item.href;
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

        {/* Spin Management Section */}
        {!collapsed && filteredSpinManagementItems.length > 0 && (
          <div style={{ padding: "8px 12px 4px", marginTop: "8px" }}>
            <button
              onClick={() => setSpinMgmtOpen(!spinMgmtOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 0",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span>{t("common.spinManagement")}</span>
              <ChevronRight style={{ width: "14px", height: "14px", transform: spinMgmtOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
          </div>
        )}

        {/* Spin Management Items */}
        {(collapsed || spinMgmtOpen) && filteredSpinManagementItems.map((item) => {
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

        {/* Marketing Management Section */}
        {!collapsed && filteredMarketingItems.length > 0 && (
          <div style={{ padding: "8px 12px 4px", marginTop: "8px" }}>
            <button
              onClick={() => setMarketingOpen(!marketingOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 0",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span>{t("common.marketingManagement")}</span>
              <ChevronRight style={{ width: "14px", height: "14px", transform: marketingOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
          </div>
        )}

        {/* Marketing Items */}
        {(collapsed || marketingOpen) && filteredMarketingItems.map((item) => {
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

        {/* Customers Management Section */}
        {!collapsed && filteredCustomerItems.length > 0 && (
          <div style={{ padding: "8px 12px 4px", marginTop: "8px" }}>
            <button
              onClick={() => setCustomersOpen(!customersOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 0",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span>{t("common.customersManagement")}</span>
              <ChevronRight style={{ width: "14px", height: "14px", transform: customersOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
          </div>
        )}

        {/* Customer Items */}
        {(collapsed || customersOpen) && filteredCustomerItems.map((item) => {
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

        {/* Setting Section */}
        {!collapsed && filteredSettingItems.length > 0 && (
          <div style={{ padding: "8px 12px 4px", marginTop: "8px" }}>
            <button
              onClick={() => setSettingOpen(!settingOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 0",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span>{t("common.setting")}</span>
              <ChevronRight style={{ width: "14px", height: "14px", transform: settingOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
          </div>
        )}

        {/* Setting Items */}
        {(collapsed || settingOpen) && filteredSettingItems.map((item) => {
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
              <span>{t("common.collapse") || "Collapse"}</span>
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
    </>
  );
}