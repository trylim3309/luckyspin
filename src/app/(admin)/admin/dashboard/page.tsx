"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, RefreshCw, Trophy, Gift, Clock } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";

interface DashboardData {
  stats: {
    totalUsers: number;
    totalSpins: number;
    todaySpins: number;
    totalWinners: number;
    totalPrizesClaimed: number;
    totalRemainingStock: number;
  };
  recentSpins: Array<{
    id: string;
    isWin: boolean;
    createdAt: string;
    user: { firstName: string; username: string | null; telegramId: string };
    prize: { name: string; type: string } | null;
  }>;
  topPrizes: Array<{ name: string; wins: number }>;
}

function StatCard({ title, value, icon: Icon, description }: { title: string; value: number; icon: any; description: string }) {
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <Icon className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useAdminData<{ stats: any; recentSpins: any[]; topPrizes: any[] }>("/api/admin/dashboard");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalUsers: 0,
    totalSpins: 0,
    todaySpins: 0,
    totalWinners: 0,
    totalPrizesClaimed: 0,
    totalRemainingStock: 0,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here's an overview of Lucky Spin.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Accounts" value={stats.totalUsers} icon={Users} description="All registered accounts" />
        <StatCard title="Total Spins" value={stats.totalSpins} icon={RefreshCw} description="All time spins" />
        <StatCard title="Today's Spins" value={stats.todaySpins} icon={Clock} description="Spins in the last 24 hours" />
        <StatCard title="Total Winners" value={stats.totalWinners} icon={Trophy} description="Users who won" />
        <StatCard title="Prizes Claimed" value={stats.totalPrizesClaimed} icon={Gift} description="Total prizes won" />
        <StatCard title="Remaining Stock" value={stats.totalRemainingStock} icon={Gift} description="Available prizes" />
      </div>

      {/* Recent Spins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Spins</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentSpins && data.recentSpins.length > 0 ? (
            <div className="space-y-4">
              {data.recentSpins.map((spin) => (
                <div key={spin.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${spin.isWin ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-600"}`}>
                      {spin.isWin ? "🎉" : "😅"}
                    </div>
                    <div>
                      <p className="font-medium">{spin.user.firstName}</p>
                      <p className="text-sm text-slate-500">{spin.prize?.name || "No prize"} ({spin.prize?.type || "N/A"})</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{new Date(spin.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No spins yet</p>
          )}
        </CardContent>
      </Card>

      {/* Top Prizes */}
      <Card>
        <CardHeader>
          <CardTitle>Top Winning Prizes</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.topPrizes && data.topPrizes.length > 0 ? (
            <div className="space-y-3">
              {data.topPrizes.map((prize, index) => (
                <div key={prize.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold">{index + 1}</div>
                  <div className="flex-1"><p className="font-medium">{prize.name}</p></div>
                  <span className="font-bold text-yellow-600">{prize.wins} wins</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No prize data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}