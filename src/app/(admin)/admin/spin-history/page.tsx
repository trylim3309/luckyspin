"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

interface SpinHistoryItem {
  id: string;
  isWin: boolean;
  resultSource: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    telegramId: string;
    username: string | null;
    firstName: string;
  };
  prize: {
    name: string;
    type: string;
    value: number;
  } | null;
}

export default function SpinHistoryPage() {
  const searchParams = useSearchParams();
  const urlUsername = searchParams.get("search") || "";

  const [history, setHistory] = useState<SpinHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(urlUsername);
  const [isWinFilter, setIsWinFilter] = useState<string>("all");
  const [resultSource, setResultSource] = useState<string>("all");

  useEffect(() => {
    fetchHistory();
  }, [search, isWinFilter, resultSource]);

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (isWinFilter !== "all") params.append("isWin", isWinFilter);
      if (resultSource !== "all") params.append("resultSource", resultSource);

      const response = await fetch(`/api/admin/spin-history?${params}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: "user",
      label: "User",
      render: (item: SpinHistoryItem) => (
        <div>
          <p className="font-medium">{item.user.firstName}</p>
          <p className="text-sm text-slate-500">@{item.user.username || item.user.telegramId}</p>
        </div>
      ),
    },
    {
      key: "prize",
      label: "Prize",
      render: (item: SpinHistoryItem) => (
        <span className={item.isWin ? "text-green-600 font-medium" : ""}>
          {item.prize?.name || "No prize"}
        </span>
      ),
    },
    { key: "value", label: "Value", render: (item: SpinHistoryItem) => `$${item.prize?.value || 0}` },
    {
      key: "isWin",
      label: "Result",
      render: (item: SpinHistoryItem) => (
        <Badge variant={item.isWin ? "default" : "secondary"}>
          {item.isWin ? "WIN" : "LOSE"}
        </Badge>
      ),
    },
    {
      key: "resultSource",
      label: "Source",
      render: (item: SpinHistoryItem) => (
        <Badge variant="outline" className="font-mono text-xs">
          {item.resultSource}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (item: SpinHistoryItem) => new Date(item.createdAt).toLocaleString(),
    },
    {
      key: "ipAddress",
      label: "IP",
      render: (item: SpinHistoryItem) => (
        <span className="text-sm text-slate-500 font-mono">{item.ipAddress || "N/A"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users" className="text-slate-500 hover:text-slate-700">
            ← Back to Users
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Spin History</h1>
            <p className="text-slate-500 mt-1">
              {urlUsername ? `Results for @${urlUsername}` : "View all spin results and outcomes"}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search by user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={isWinFilter} onValueChange={(val) => setIsWinFilter(val || "all")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Wins</SelectItem>
            <SelectItem value="false">Loses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={resultSource} onValueChange={(val) => setResultSource(val || "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="RANDOM">Random</SelectItem>
            <SelectItem value="ADMIN_CONTROL">Admin Control</SelectItem>
            <SelectItem value="FORCE_WIN">Force Win</SelectItem>
            <SelectItem value="FORCE_LOSE">Force Lose</SelectItem>
            <SelectItem value="USER_CONTROLLED">User Controlled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <DataTable
            data={history}
            columns={columns}
            emptyMessage="No spin history found"
          />
          <p className="text-sm text-slate-500">Total: {total} records</p>
        </>
      )}
    </div>
  );
}