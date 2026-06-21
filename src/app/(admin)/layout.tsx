import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </LanguageProvider>
  );
}