"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminHeader } from "@/components/admin/Header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  }, [router, pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/admin/dashboard", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.admin) {
            setCurrentUser(data.admin);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <AdminHeader user={currentUser} sidebarCollapsed={sidebarCollapsed} />
      <main className={`pt-16 p-8 transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        {children}
      </main>
    </div>
  );
}