"use client";

import { StatCard } from "@/components/admin/StatCard";
import { Users, RefreshCw, Trophy, Gift, Clock, TrendingUp, Eye, Award, UserCheck } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";

export default function DashboardPage() {
  const { data, isLoading } = useAdminData<{
    stats: any;
    recentSpins: any[];
    topPrizes: any[];
  }>("/api/admin/dashboard");

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

  const stats = data?.stats || {};
  const safeStats = {
    totalUsers: stats.totalUsers || 0,
    totalSpins: stats.totalSpins || 0,
    todaySpins: stats.todaySpins || 0,
    totalWinners: stats.totalWinners || 0,
    totalPrizesClaimed: stats.totalPrizesClaimed || 0,
    totalRemainingStock: stats.totalRemainingStock || 0,
    totalCustomers: stats.totalCustomers || 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#212529]">Dashboard</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">Welcome back! Here&apos;s what&apos;s happening with Lucky Spin.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[12px] text-[#6B7280] bg-white px-3 py-2 rounded-lg border border-[#E2E8F0]">
          <Eye className="w-4 h-4" />
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard
          title="Total Accounts"
          value={safeStats.totalUsers.toLocaleString()}
          icon={Users}
          description="All registered accounts"
        />
        <StatCard
          title="Total Spins"
          value={safeStats.totalSpins.toLocaleString()}
          icon={RefreshCw}
          description="All time spins"
        />
        <StatCard
          title="Today's Spins"
          value={safeStats.todaySpins.toLocaleString()}
          icon={Clock}
          description="Spins in last 24 hours"
        />
        <StatCard
          title="Total Winners"
          value={safeStats.totalWinners.toLocaleString()}
          icon={Trophy}
          description="Users who won"
        />
        <StatCard
          title="Prizes Claimed"
          value={safeStats.totalPrizesClaimed.toLocaleString()}
          icon={Gift}
          description="Total prizes won"
        />
        <StatCard
          title="Remaining Stock"
          value={safeStats.totalRemainingStock.toLocaleString()}
          icon={Award}
          description="Available prizes"
        />
        <StatCard
          title="Total Customers"
          value={safeStats.totalCustomers.toLocaleString()}
          icon={UserCheck}
          description="All CRM customers"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Spins */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#495057]">Recent Spins</h2>
            <span className="text-[11px] text-[#6B7280] bg-[#F4F5F7] px-2 py-1 rounded-full">
              Latest 5
            </span>
          </div>
          <div className="p-5">
            {data?.recentSpins && data.recentSpins.length > 0 ? (
              <div className="space-y-3">
                {data.recentSpins.map((spin: any) => (
                  <div
                    key={spin.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-[#F8F9FA] hover:bg-[#F4F5F7] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm ${
                          spin.isWin
                            ? "bg-gradient-to-br from-[#4CAF50] to-[#66BB6A] text-white"
                            : "bg-gradient-to-br from-[#9E9E9E] to-[#BDBDBD] text-white"
                        }`}
                      >
                        {spin.isWin ? "🎁" : "😢"}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#495057]">{spin.user.firstName}</p>
                        <p className="text-[12px] text-[#6B7280]">
                          {spin.prize?.name || "No prize"} • {spin.prize?.type || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[12px] font-medium ${spin.isWin ? "text-[#4CAF50]" : "text-[#6B7280]"}`}>
                        {spin.isWin ? "WIN" : "LOSE"}
                      </span>
                      <p className="text-[11px] text-[#A0A0B2] mt-1">
                        {new Date(spin.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F4F5F7] flex items-center justify-center mb-4">
                  <RefreshCw className="w-8 h-8 text-[#E2E8F0]" />
                </div>
                <p className="text-[14px] text-[#6B7280]">No spins recorded yet</p>
                <p className="text-[12px] text-[#A0A0B2] mt-1">Spins will appear here once users start playing</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Prizes */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#495057]">Top Winning Prizes</h2>
            <span className="text-[11px] text-[#6B7280] bg-[#F4F5F7] px-2 py-1 rounded-full">
              By frequency
            </span>
          </div>
          <div className="p-5">
            {data?.topPrizes && data.topPrizes.length > 0 ? (
              <div className="space-y-3">
                {data.topPrizes.map((prize: any, index: number) => (
                  <div
                    key={prize.name}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F9FA] hover:bg-[#F4F5F7] transition-all cursor-pointer group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shadow-md"
                      style={{
                        background: index === 0
                          ? "linear-gradient(135deg, #FFB90F 0%, #FFD54F 100%)"
                          : index === 1
                          ? "linear-gradient(135deg, #9E9E9E 0%, #BDBDBD 100%)"
                          : index === 2
                          ? "linear-gradient(135deg, #CD7F32 0%, #DDA15E 100%)"
                          : "linear-gradient(135deg, #6D41D7 0%, #9B7CF4 100%)"
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-[#495057]">{prize.name}</p>
                      <p className="text-[12px] text-[#6B7280]">Most won prize</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[16px] font-bold text-[#6D41D7]">{prize.wins}</span>
                      <p className="text-[11px] text-[#A0A0B2]">wins</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F4F5F7] flex items-center justify-center mb-4">
                  <Award className="w-8 h-8 text-[#E2E8F0]" />
                </div>
                <p className="text-[14px] text-[#6B7280]">No prize data yet</p>
                <p className="text-[12px] text-[#A0A0B2] mt-1">Top prizes will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}