import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-[#E2E8F0] p-4 ${className || ""}`}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="avatar">
          <div
            className="avatar-initial bg-label-primary rounded"
            style={{ background: "linear-gradient(135deg, rgba(109, 65, 215, 0.1) 0%, rgba(155, 124, 244, 0.1) 100%)" }}
          >
            <Icon className="w-5 h-5" style={{ color: "#6D41D7" }} />
          </div>
        </div>
        {trend && (
          <span
            className={`badge rounded-pill text-[11px] fw-semibold ${
              trend.isPositive ? "bg-label-success text-success" : "bg-label-danger text-danger"
            }`}
          >
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <h4 className="mb-0 text-[24px] fw-bold text-[#212529]">{value}</h4>
      <p className="text-[13px] text-[#6B7280] mb-0">{title}</p>
      {description && (
        <p className="text-[12px] text-[#A0A0B2] mt-1 mb-0">{description}</p>
      )}
    </div>
  );
}