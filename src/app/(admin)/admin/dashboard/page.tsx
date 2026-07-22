"use client";

import { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, TrendingUp, Award } from "lucide-react";

type Team = "KING88" | "SKY24" | "B88";

const TEAM_COLORS: Record<Team, string> = {
  KING88: "#9333EA",
  SKY24: "#3B82F6",
  B88: "#F97316",
};

export default function DashboardPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { data, isLoading, mutate } = useAdminData<{
    todayCustomers: number;
    weekCustomers: number;
    monthCustomers: number;
    lastMonthCustomers: number;
    teamStats: Record<string, number>;
    agentStats: { id: string; name: string; fullName?: string | null; role: string; teams: string[]; totalCustomers: number }[];
    userTeams: string[];
    isRestricted: boolean;
  }>(`/api/admin/dashboard${selectedTeam ? `?team=${selectedTeam}` : ""}`);

  const handleTeamClick = (team: string) => {
    if (selectedTeam === team) {
      setSelectedTeam(null);
    } else {
      setSelectedTeam(team);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-[#6D41D7] border-t-transparent" />
          <p className="text-[14px] text-[#6B7280]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const safeData = {
    todayCustomers: data?.todayCustomers || 0,
    weekCustomers: data?.weekCustomers || 0,
    monthCustomers: data?.monthCustomers || 0,
    lastMonthCustomers: data?.lastMonthCustomers || 0,
    teamStats: data?.teamStats || { KING88: 0, SKY24: 0, B88: 0 },
    agentStats: data?.agentStats || [],
    userTeams: data?.userTeams || ["KING88"],
    isRestricted: data?.isRestricted || false,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-[22px] font-bold text-[#212529]">Customer Dashboard</h1>
        <p className="text-[14px] text-[#6B7280] mt-1">Track your sales team performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Today</p>
              <p className="text-[24px] font-bold text-[#212529]">{safeData.todayCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">This Week</p>
              <p className="text-[24px] font-bold text-[#212529]">{safeData.weekCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">This Month</p>
              <p className="text-[24px] font-bold text-[#212529]">{safeData.monthCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Last Month</p>
              <p className="text-[24px] font-bold text-[#212529]">{safeData.lastMonthCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats - only for Admin/SUPER_ADMIN/MANAGER */}
      {!safeData.isRestricted && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-[#495057]">By Team</h2>
            {selectedTeam && (
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-[12px] text-[#6D41D7] hover:text-[#5a35c6] font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(["KING88", "SKY24", "B88"] as Team[]).map((team) => (
              <button
                key={team}
                onClick={() => handleTeamClick(team)}
                className={`text-center p-4 rounded-xl transition-all ${
                  selectedTeam === team
                    ? "ring-2 ring-[#6D41D7] bg-[#F8F9FA]"
                    : "bg-[#F8F9FA] hover:bg-[#F0F1F3]"
                }`}
              >
                <Badge
                  className="text-xs font-bold mb-2"
                  style={{ backgroundColor: TEAM_COLORS[team], color: "#fff" }}
                >
                  {team}
                </Badge>
                <p className="text-[28px] font-bold text-[#212529]">{safeData.teamStats[team] || 0}</p>
                <p className="text-[12px] text-[#6B7280]">customers</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent Leaderboard */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-[#495057]">Sales Agent Leaderboard</h2>
            {selectedTeam && (
              <Badge style={{ backgroundColor: TEAM_COLORS[selectedTeam as Team], color: "#fff" }}>
                {selectedTeam}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-[#6B7280] bg-[#F4F5F7] px-2 py-1 rounded-full">
            Ranked by total customers
          </span>
        </div>
        <div className="p-5">
          {safeData.agentStats.length > 0 ? (
            <div className="space-y-3">
              {safeData.agentStats.map((agent, index) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F9FA] hover:bg-[#F4F5F7] transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shadow-md"
                    style={{
                      background:
                        index === 0
                          ? "linear-gradient(135deg, #FFB90F 0%, #FFD54F 100%)"
                          : index === 1
                          ? "linear-gradient(135deg, #9E9E9E 0%, #BDBDBD 100%)"
                          : index === 2
                          ? "linear-gradient(135deg, #CD7F32 0%, #DDA15E 100%)"
                          : "linear-gradient(135deg, #6D41D7 0%, #9B7CF4 100%)",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#495057]">{agent.fullName || agent.name}</p>
                      <Badge variant="outline" className="text-[10px]">{agent.role}</Badge>
                      <div className="flex gap-1">
                        {agent.teams.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
                            style={{ backgroundColor: TEAM_COLORS[t as Team] || "#6B7280" }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-bold text-[#6D41D7]">{agent.totalCustomers}</span>
                    <p className="text-[11px] text-[#6B7280]">customers</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F4F5F7] flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[#E2E8E0]" />
              </div>
              <p className="text-[14px] text-[#6B7280]">No customer data yet</p>
              <p className="text-[12px] text-[#A0A0B2] mt-1">Customer stats will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
