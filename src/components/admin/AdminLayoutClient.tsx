"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminHeader } from "@/components/admin/Header";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [adminLogoUrl, setAdminLogoUrl] = useState<string | null>(null);

  // Check screen size immediately
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 1024;
      setIsSmallScreen(isSmall);
      setSidebarCollapsed(isSmall);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          router.push("/admin/login");
        }
      })
      .catch(() => {
        router.push("/admin/login");
      });
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/admin/dashboard", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.admin) setCurrentUser(data.admin);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Fetch settings for admin logo
  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/admin/settings", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.settings?.adminLogoUrl) {
            setAdminLogoUrl(data.settings.adminLogoUrl);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#1E1E2D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="spin"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "3px solid rgba(109, 65, 215, 0.3)",
            borderTopColor: "#6D41D7",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F7" }}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        adminLogoUrl={adminLogoUrl}
      />
      <AdminHeader user={currentUser} sidebarCollapsed={sidebarCollapsed} />
      <main
        style={{
          paddingTop: "60px",
          paddingLeft: isSmallScreen ? "76px" : (sidebarCollapsed ? "76px" : "260px"),
          minHeight: "100vh",
          transition: "padding-left 0.3s ease",
        }}
      >
        <div style={{ padding: "24px" }}>{children}</div>
      </main>
    </div>
  );
}