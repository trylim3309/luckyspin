"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/admin/DataTable";
import { Ban, Trash2, Plus, Edit } from "lucide-react";
import Link from "next/link";

interface SpinCondition {
  id: string;
  name: string;
  maxSpinsPerDay: number;
  minBalanceRequired: number;
  zeroBalanceCanSpin: boolean;
  freeSpinEnabled: boolean;
  winCooldownMinutes: number;
  isActive: boolean;
}

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
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustType, setAdjustType] = useState<"add" | "remove">("add");

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    balance: 0,
  });

  const [conditions, setConditions] = useState<SpinCondition[]>([]);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<SpinCondition | null>(null);
  const [depositSpins, setDepositSpins] = useState(0);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawSpins, setWithdrawSpins] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchConditions();
  }, [search]);

  const fetchConditions = async () => {
    try {
      const response = await fetch("/api/admin/conditions", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setConditions(data.conditions);
      }
    } catch (error) {
      console.error("Failed to fetch conditions:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      balance: 0,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName || "",
      phone: user.phone || "",
      email: user.email || "",
      balance: user.balance,
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const method = editingUser ? "PUT" : "POST";
      const url = editingUser ? "/api/admin/users" : "/api/admin/users";
      const body: Record<string, unknown> = {
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName || null,
        phone: formData.phone || null,
        email: formData.email || null,
        balance: formData.balance,
      };

      if (editingUser) {
        body.id = editingUser.id;
      }

      if (!editingUser || formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to save user");
        return;
      }

      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      await fetch(`/api/admin/users?id=${deletingUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const handleBlockToggle = async (user: User) => {
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isBlocked: !user.isBlocked }),
        credentials: "include",
      });
      fetchUsers();
    } catch (error) {
      console.error("Failed to toggle block:", error);
    }
  };

  const handleAddSpins = (user: User) => {
    setAdjustingUser(user);
    setAdjustType("add");
    setIsDepositDialogOpen(true);
    setSelectedCondition(null);
    setDepositSpins(0);
  };

  const handleRemoveSpins = (user: User) => {
    setAdjustingUser(user);
    setWithdrawSpins(1);
    setIsWithdrawDialogOpen(true);
  };

  const handleDepositSpins = async () => {
    if (!adjustingUser || !selectedCondition) return;
    try {
      const newTotal = adjustingUser.totalSpins + depositSpins;
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: adjustingUser.id,
          totalSpins: newTotal,
          conditionId: selectedCondition.id,
          spinsDeposited: depositSpins,
        }),
        credentials: "include",
      });
      setIsDepositDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to deposit spins:", error);
    }
  };

  const handleWithdrawSpins = async () => {
    if (!adjustingUser) return;
    try {
      const newTotal = Math.max(0, adjustingUser.totalSpins - withdrawSpins);
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: adjustingUser.id, totalSpins: newTotal }),
        credentials: "include",
      });
      setIsWithdrawDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to withdraw spins:", error);
    }
  };

  const columns = [
    {
      key: "account",
      label: "Account",
      render: (user: User) => (
        <Link
          href={`/admin/spin-history?search=${encodeURIComponent(user.username)}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          @{user.username}
        </Link>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (user: User) => (
        <span>{user.firstName} {user.lastName || ""}</span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (user: User) => (
        <span className="text-slate-600">{user.phone || "-"}</span>
      ),
    },
    {
      key: "spinsLeft",
      label: "Spins Left",
      render: (user: User) => (
        <span className="font-medium text-blue-600">{user.spinsLeft ?? user.totalSpins}</span>
      ),
    },
    {
      key: "balance",
      label: "Deposit/Withdraw",
      render: (user: User) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleAddSpins(user)}
            className="px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition-colors"
          >
            Deposit
          </button>
          <button
            onClick={() => handleRemoveSpins(user)}
            className="px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors"
          >
            Withdraw
          </button>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (user: User) => (
        <Badge variant={user.isBlocked ? "destructive" : "default"}>
          {user.isBlocked ? "Blocked" : "Active"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant={user.isBlocked ? "default" : "destructive"}
            size="sm"
            onClick={() => handleBlockToggle(user)}
          >
            <Ban className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleOpenDelete(user)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage spin game accounts</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-yellow-500 hover:bg-yellow-600">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name, username, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <DataTable
            data={users}
            columns={columns}
            searchPlaceholder="Search users..."
            onSearch={(value) => setSearch(value)}
          />
          <p className="text-sm text-slate-500">Total: {total} users</p>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username *</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                disabled={!!editingUser}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{editingUser ? "New Password" : "Password *"}</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Balance ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600">
              {editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>

          {deletingUser && (
            <p className="text-slate-600">
              Are you sure you want to delete user <span className="font-medium">{deletingUser.firstName}</span>?
              This action cannot be undone.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deposit Spins</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Condition</label>
              <select
                value={selectedCondition?.id || ""}
                onChange={(e) => {
                  const condition = conditions.find(c => c.id === e.target.value);
                  setSelectedCondition(condition || null);
                  if (condition) setDepositSpins(condition.maxSpinsPerDay);
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a condition...</option>
                {conditions.filter(c => c.isActive).map(condition => (
                  <option key={condition.id} value={condition.id}>
                    {condition.name} (Max: {condition.maxSpinsPerDay})
                  </option>
                ))}
              </select>
            </div>

            {selectedCondition && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Spins</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedCondition.maxSpinsPerDay}
                  value={depositSpins}
                  onChange={(e) => setDepositSpins(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-slate-500">
                  Max: {selectedCondition.maxSpinsPerDay} spins per day
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDepositSpins}
              disabled={!selectedCondition || depositSpins <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Spins</DialogTitle>
          </DialogHeader>

          {adjustingUser && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Withdraw spins from <span className="font-medium">{adjustingUser.firstName}</span>.
                Current spins: <span className="font-semibold">{adjustingUser.totalSpins}</span>
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Spins to Withdraw</label>
                <Input
                  type="number"
                  min="1"
                  max={adjustingUser.totalSpins}
                  value={withdrawSpins}
                  onChange={(e) => setWithdrawSpins(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleWithdrawSpins}
              disabled={!adjustingUser || withdrawSpins <= 0 || withdrawSpins > adjustingUser.totalSpins}
              className="bg-red-600 hover:bg-red-700"
            >
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}