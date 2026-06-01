"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Minus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  balance: number;
  isBlocked: boolean;
  totalSpins: number;
  totalWins: number;
  spinsLeft: number;
  spinType: string;
  createdAt: string;
}

interface SpinResult {
  id: string;
  isWin: boolean;
  resultSource: string;
  createdAt: string;
  prize: { name: string; type: string; value: number } | null;
}

interface DepositWithdraw {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  amount: number;
  createdAt: string;
  note: string | null;
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const { data: userData, isLoading: userLoading } = useSWR<{ user: User }>(`/api/admin/users?id=${userId}`, fetcher);
  const { data: historyData, isLoading: historyLoading, mutate: mutateHistory } = useSWR<{ history: SpinResult[]; total: number }>(`/api/admin/spin-history?userId=${userId}`, fetcher);
  const { data: transactionData, isLoading: txLoading, mutate: mutateTransactions } = useSWR<{ transactions: DepositWithdraw[] }>(`/api/admin/transactions?userId=${userId}`, fetcher, { revalidateOnFocus: true });

  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  const user = userData?.user;
  const history = historyData?.history || [];
  const transactions = transactionData?.transactions || [];

  const handleDeposit = async () => {
    if (!user || depositAmount <= 0) return;
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        totalSpins: user.totalSpins + depositAmount,
        transactionType: "DEPOSIT",
        transactionAmount: depositAmount,
      }),
      credentials: "include",
    });
    setDepositAmount(0);
    mutateTransactions();
  };

  const handleWithdraw = async () => {
    if (!user || withdrawAmount <= 0) return;
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        totalSpins: Math.max(0, user.totalSpins - withdrawAmount),
        transactionType: "WITHDRAW",
        transactionAmount: withdrawAmount,
      }),
      credentials: "include",
    });
    setWithdrawAmount(0);
    mutateTransactions();
  };

  if (userLoading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" /></div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-slate-500">User not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back to Users</Button>
        </Link>
        <h1 className="text-2xl font-bold">Account: @{user.username}</h1>
        <Badge variant={user.isBlocked ? "destructive" : "default"}>{user.isBlocked ? "Blocked" : "Active"}</Badge>
      </div>

      {/* User Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>User Info</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p><span className="text-slate-500">Name:</span> {user.firstName} {user.lastName || ""}</p>
            <p><span className="text-slate-500">Phone:</span> {user.phone || "-"}</p>
            <p><span className="text-slate-500">Email:</span> {user.email || "-"}</p>
            <p><span className="text-slate-500">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Spin Stats</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p><span className="text-slate-500">Total Spins:</span> {user.totalSpins}</p>
            <p><span className="text-slate-500">Total Wins:</span> {user.totalWins}</p>
            <p><span className="text-slate-500">Spin Type:</span> <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.spinType === "FIXED" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>{user.spinType === "FIXED" ? "📊 Fixed" : "📅 Daily"}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)} className="flex-1 p-2 border rounded" placeholder="Amount" />
              <Button onClick={handleDeposit} size="sm" className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-1" />Deposit</Button>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)} className="flex-1 p-2 border rounded" placeholder="Amount" />
              <Button onClick={handleWithdraw} size="sm" variant="destructive"><Minus className="w-4 h-4 mr-1" />Withdraw</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for History */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Deposit/Withdraw History</TabsTrigger>
          <TabsTrigger value="results">Spin Result History</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-4">
              {txLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent" /></div>
              ) : transactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "DEPOSIT" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {tx.type === "DEPOSIT" ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium">{tx.type === "DEPOSIT" ? "Deposit" : "Withdraw"} - {tx.amount} spins</p>
                          <p className="text-sm text-slate-500">{tx.note || "No note"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="results">
          <Card>
            <CardContent className="p-4">
              {historyLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent" /></div>
              ) : history.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No spin results yet</p>
              ) : (
                <div className="space-y-2">
                  {history.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result.isWin ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-600"}`}>
                          {result.isWin ? "🎉" : "😅"}
                        </div>
                        <div>
                          <p className="font-medium">{result.prize?.name || "No prize"}</p>
                          <p className="text-sm text-slate-500">{result.prize?.type} - ${result.prize?.value || 0}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">{new Date(result.createdAt).toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{result.resultSource}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}