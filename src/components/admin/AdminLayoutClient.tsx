"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminHeader } from "@/components/admin/Header";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; permissions?: string[] } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [adminLogoUrl, setAdminLogoUrl] = useState<string | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  // Check screen size immediately
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 1024;
      setIsSmallScreen(isSmall);
      setSidebarCollapsed(false);
      setSidebarHidden(isSmall); // Hidden on small screens, visible on large screens
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

  // Fetch current admin user
  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/admin/me", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.admin) {
            setCurrentUser({
              id: data.admin.id,
              name: data.admin.name,
              role: data.admin.role,
              permissions: data.admin.permissions || [],
            });
          }
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
    <div style={{ minHeight: "100vh", background: "#F4F5F7", zIndex: 1 }}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        hidden={isSmallScreen ? sidebarHidden : false}
        onCollapsedChange={setSidebarCollapsed}
        onHiddenChange={setSidebarHidden}
        adminLogoUrl={adminLogoUrl}
        permissions={currentUser?.permissions}
        role={currentUser?.role}
      />
      <AdminHeader
        user={currentUser}
        sidebarCollapsed={sidebarCollapsed}
        sidebarHidden={isSmallScreen ? sidebarHidden : false}
        onSidebarToggle={() => setSidebarHidden(!sidebarHidden)}
      />
      <main
        style={{
          paddingTop: "60px",
          paddingLeft: isSmallScreen
            ? (sidebarHidden ? "0" : "260px")
            : (sidebarCollapsed ? "76px" : "260px"),
          minHeight: "100vh",
          transition: "padding-left 0.3s ease",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ padding: "24px" }}>{children}</div>
      </main>
    </div>
  );
}