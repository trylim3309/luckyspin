"use client";

import { LogOut, Bell, Search, Settings, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    }
  };

  const sidebarWidth = sidebarCollapsed ? 76 : 260;

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "60px",
        left: `${sidebarWidth}px`,
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 50,
        transition: "left 0.3s ease",
      }}
    >
      {/* Page Title */}
      <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#495057", margin: 0 }}>
        Admin Panel
      </h1>

      {/* Right Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Search */}
        <div style={{ position: "relative", width: "280px" }}>
          <Search
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
              color: "#A0A0B2",
            }}
          />
          <input
            type="text"
            placeholder="Search..."
            style={{
              width: "100%",
              height: "36px",
              paddingLeft: "36px",
              paddingRight: "12px",
              borderRadius: "6px",
              border: "1px solid #E2E8F0",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#6D41D7"}
            onBlur={(e) => e.target.style.borderColor = "#E2E8F0"}
          />
        </div>

        {/* Notifications */}
        <div style={{ position: "relative" }} ref={notifMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#F4F5F7"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <Bell style={{ width: "20px", height: "20px", color: "#6B7280" }} />
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#EA3943",
                color: "#FFFFFF",
                fontSize: "10px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              3
            </span>
          </button>

          {showNotifMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "320px",
                background: "#FFFFFF",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                border: "1px solid #E2E8F0",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#495057" }}>
                  Notifications
                </span>
                <a
                  href="#"
                  style={{
                    fontSize: "12px",
                    color: "#6D41D7",
                    textDecoration: "none",
                  }}
                >
                  Mark all read
                </a>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "32px 16px",
                  color: "#A0A0B0",
                }}
              >
                <Bell style={{ width: "40px", height: "40px", opacity: 0.3, marginBottom: "8px" }} />
                <p style={{ fontSize: "14px", margin: 0 }}>No notifications yet</p>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div style={{ position: "relative" }} ref={userMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "4px 12px 4px 4px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "24px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#F4F5F7"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6D41D7 0%, #9B7CF4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 600 }}>
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </span>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#495057" }}>
                {user?.name || "Admin"}
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280" }}>
                {user?.role || "Admin"}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "200px",
                background: "#FFFFFF",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                border: "1px solid #E2E8F0",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#495057" }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280" }}>{user?.role}</div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <a
                  href="#"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    color: "#495057",
                    fontSize: "14px",
                    textDecoration: "none",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F4F5F7"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <User style={{ width: "16px", height: "16px" }} />
                  <span>Profile</span>
                </a>
                <a
                  href="#"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    color: "#495057",
                    fontSize: "14px",
                    textDecoration: "none",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F4F5F7"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <Settings style={{ width: "16px", height: "16px" }} />
                  <span>Settings</span>
                </a>
              </div>
              <div style={{ padding: "8px 0", borderTop: "1px solid #E2E8F0" }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#EA3943",
                    fontSize: "14px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#FEF2F2"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <LogOut style={{ width: "16px", height: "16px" }} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}