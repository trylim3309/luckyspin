"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/admin/DataTable";
import { Trash2, Plus, Edit } from "lucide-react";

type Role = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "TEAM_LEADER" | "MANAGER" | "VIEWER";

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
  TEAM_LEADER: "Team Leader",
  MANAGER: "Manager",
  VIEWER: "Viewer",
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "#9333EA",
  ADMIN: "#6D41D7",
  AGENT: "#3B82F6",
  TEAM_LEADER: "#10B981",
  MANAGER: "#F59E0B",
  VIEWER: "#6B7280",
};

// Default permissions per role - can be overridden per user
const ROLE_DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ["prizes", "conditions", "result_control", "users", "spin_history", "promotions", "team", "settings", "customers"],
  ADMIN: ["prizes", "conditions", "result_control", "users", "spin_history", "promotions", "team", "settings", "customers"],
  AGENT: ["customers", "spin_history"],
  TEAM_LEADER: ["customers", "spin_history", "team"],
  MANAGER: ["prizes", "conditions", "spin_history", "promotions", "team", "customers"],
  VIEWER: ["spin_history"],
};

interface AdminUser {
  id: string;
  name: string;
  role: Role;
  permissions: string[];
  team: "KING88" | "SKY24" | "B88";
  createdAt: string;
}

const PERMISSIONS = [
  { key: "prizes", label: "Prizes Management" },
  { key: "conditions", label: "Spin Conditions" },
  { key: "result_control", label: "Result Control" },
  { key: "users", label: "Accounts" },
  { key: "spin_history", label: "Spin History" },
  { key: "promotions", label: "Promotions" },
  { key: "team", label: "Team Management" },
  { key: "settings", label: "Settings" },
  { key: "customers", label: "Customers" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(ROLE_DEFAULT_PERMISSIONS);
  const [formData, setFormData] = useState<{
    name: string;
    password: string;
    role: Role;
    team: "KING88" | "SKY24" | "B88";
    permissions?: string[];
  }>({
    name: "",
    password: "",
    role: "AGENT",
    team: "KING88",
  });

  useEffect(() => {
    fetchUsers();
    fetchRolePermissions();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/admin-users?search=${encodeURIComponent(search)}`, {
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

  const fetchRolePermissions = async () => {
    try {
      const res = await fetch("/api/admin/roles", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRolePermissions(data.roles);
      }
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      password: "",
      role: "AGENT",
      team: "KING88",
      permissions: rolePermissions["AGENT"] || []
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      password: "",
      role: user.role,
      team: user.team,
      permissions: user.permissions && user.permissions.length > 0 ? user.permissions : (rolePermissions[user.role] || [])
    });
    setIsDialogOpen(true);
  };

  const handleRoleChange = (newRole: Role) => {
    // When role changes, optionally update permissions to new role defaults
    // Keep existing custom permissions if user has customized them
    const currentPerms = formData.permissions || [];
    const defaultPerms = rolePermissions[newRole] || [];
    setFormData({
      ...formData,
      role: newRole,
      permissions: currentPerms.length === 0 || (currentPerms.length === defaultPerms.length && currentPerms.every((p, i) => p === defaultPerms[i]))
        ? defaultPerms
        : currentPerms
    });
  };

  const handleOpenDelete = (user: AdminUser) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Username is required");
      return;
    }

    if (!editingUser && !formData.password) {
      alert("Password is required");
      return;
    }

    try {
      const method = editingUser ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        name: formData.name.trim(),
        role: formData.role,
        team: formData.team,
      };
      if (editingUser) body.id = editingUser.id;
      if (formData.password) body.password = formData.password;
      if (formData.permissions && formData.permissions.length > 0) {
        body.permissions = formData.permissions;
      }

      const response = await fetch("/api/admin/admin-users", {
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
      setFormData({ name: "", password: "", role: "AGENT", team: "KING88" });
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await fetch(`/api/admin/admin-users?id=${deletingUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Username",
      render: (user: AdminUser) => <span className="font-medium">{user.name}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (user: AdminUser) => (
        <span style={{
          padding: "2px 8px",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: 600,
          background: ROLE_COLORS[user.role] + "20",
          color: ROLE_COLORS[user.role],
        }}>
          {ROLE_LABELS[user.role]}
        </span>
      ),
    },
    {
      key: "team",
      label: "Team",
      render: (user: AdminUser) => (
        <span style={{
          padding: "2px 8px",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: 700,
          background: user.team === "KING88" ? "#9333EA" : user.team === "SKY24" ? "#3B82F6" : "#F97316",
          color: "#fff",
        }}>
          {user.team}
        </span>
      ),
    },
    {
      key: "permissions",
      label: "Permissions",
      render: (user: AdminUser) => (
        <div className="flex flex-wrap gap-1">
          {!user.permissions || user.permissions.length === 0 ? (
            <span className="text-[#868D9E] text-sm">All</span>
          ) : (
            <>
              {user.permissions.slice(0, 3).map((p) => (
                <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
              ))}
              {user.permissions.length > 3 && (
                <Badge variant="outline" className="text-xs">+{user.permissions.length - 3}</Badge>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (user: AdminUser) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (user: AdminUser) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleOpenDelete(user)}>
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
          <h1 className="text-2xl font-bold text-[#233446]">Admin Users</h1>
          <p className="text-[#868D9E] mt-1">Manage admin accounts</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-10 rounded-lg text-white font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)" }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Admin User
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#868D9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-lg border-[#E2E8F0] focus:border-[#6D41D7] focus:ring-1 focus:ring-[#6D41D7]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#6D41D7] border-t-transparent" />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 280px)", minHeight: "500px" }}>
            <DataTable data={users} columns={columns} searchPlaceholder="Search users..." />
          </div>
          <p className="text-sm text-[#868D9E]">Total: {total} users</p>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Admin User" : "Create Admin User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter username"
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className="w-full p-2 border rounded-md"
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <select
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value as "KING88" | "SKY24" | "B88" })}
                className="w-full p-2 border rounded-md"
              >
                <option value="KING88">KING88</option>
                <option value="SKY24">SKY24</option>
                <option value="B88">B88</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Permissions</label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg">
                {PERMISSIONS.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.includes(perm.key) || false}
                      onChange={(e) => {
                        const current = formData.permissions || [];
                        const updated = e.target.checked
                          ? [...current, perm.key]
                          : current.filter(p => p !== perm.key);
                        setFormData({ ...formData, permissions: updated });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[#868D9E]">Role defaults are pre-selected. Uncheck any to customize for this user.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="h-10 rounded-lg border-[#E2E8F0]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="h-10 rounded-lg text-white font-medium transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)" }}
            >
              {editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Admin User</DialogTitle></DialogHeader>
          {deletingUser && (
            <p className="text-slate-600">Are you sure you want to delete <span className="font-medium">{deletingUser.name}</span>? This action cannot be undone.</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-10 rounded-lg border-[#E2E8F0]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="h-10 rounded-lg bg-red-500 hover:bg-red-600"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}