"use client";

import { LogOut, Settings, User, List, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";

interface AdminUser {
  id: string;
  name: string;
  fullName?: string;
  role: string;
  teams?: string[];
}

interface AdminHeaderProps {
  user: AdminUser | null;
  sidebarCollapsed: boolean;
  sidebarHidden: boolean;
  onSidebarToggle: () => void;
}

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "kh", name: "Khmer", flag: "🇰🇭" },
];

export function AdminHeader({ user, sidebarCollapsed, sidebarHidden, onSidebarToggle }: AdminHeaderProps) {
  const { locale, setLocale, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [currentLang, setCurrentLang] = useState(languages[1]); // Default to Khmer
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Sync currentLang when locale changes
  useEffect(() => {
    const lang = languages.find((l) => l.code === locale) || languages[1];
    setCurrentLang(lang);
  }, [locale]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
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

  const handleLanguageChange = (lang: typeof languages[0]) => {
    setLocale(lang.code as "en" | "kh");
    setCurrentLang(lang);
    setShowLangMenu(false);
  };

  const sidebarWidth = sidebarHidden ? 0 : (sidebarCollapsed ? 76 : 260);

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
      {/* Left side - Menu button + User Badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Sidebar Toggle Button - always visible on small screens */}
        <button
          id="sidebar-toggle-btn"
          onClick={onSidebarToggle}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#F4F5F7"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <List style={{ width: "20px", height: "20px", color: "#6B7280" }} />
        </button>

        {/* User Badges */}
        {(user?.fullName || user?.teams) && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {user?.fullName && (
              <span style={{
                padding: "4px 10px",
                borderRadius: "12px",
                background: "#EDE9FE",
                color: "#6D41D7",
                fontSize: "13px",
                fontWeight: 500,
              }}>
                {user.fullName}
              </span>
            )}
            {user?.teams?.map((team) => {
              const teamColor = team === "KING88" ? "#9333EA" : team === "SKY24" ? "#3B82F6" : "#F97316";
              return (
                <span key={team} style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  background: teamColor,
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 500,
                }}>
                  {team}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Language Selector */}
        <div style={{ position: "relative" }} ref={langMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLangMenu(!showLangMenu);
              setShowUserMenu(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              background: "transparent",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#F4F5F7"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: "20px" }}>{currentLang.flag}</span>
            <span style={{ fontSize: "14px", color: "#495057" }}>{currentLang.code.toUpperCase()}</span>
            <Globe style={{ width: "16px", height: "16px", color: "#6B7280" }} />
          </button>

          {showLangMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "160px",
                background: "#FFFFFF",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                border: "1px solid #E2E8F0",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#495057",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F4F5F7"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontSize: "20px" }}>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div style={{ position: "relative" }} ref={userMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(!showUserMenu);
              setShowLangMenu(false);
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
                  <span>{t("common.profile")}</span>
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
                  <span>{t("common.settings")}</span>
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
                  <span>{t("common.signOut")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}