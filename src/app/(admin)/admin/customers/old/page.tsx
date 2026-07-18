"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Users } from "lucide-react";

export default function OldCustomersPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#233446]">{t("common.oldCustomers")}</h1>
          <p className="text-[#868D9E] mt-1">
            View archived or inactive customer accounts
          </p>
        </div>
      </div>

      {/* Placeholder */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <Users style={{ width: "36px", height: "36px", color: "#fff" }} />
        </div>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
          Coming Soon
        </h3>
        <p style={{ fontSize: "14px", color: "#6B7280", maxWidth: "400px", margin: "0 auto" }}>
          The Old Customers page is under development. It will display archived, blocked, or
          long-inactive customer accounts with detailed history and bulk actions.
        </p>
      </div>
    </div>
  );
}
