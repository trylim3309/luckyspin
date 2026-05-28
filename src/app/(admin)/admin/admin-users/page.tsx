"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/admin/DataTable";
import { Trash2, Plus, Edit } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  role: "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    role: "ADMIN" as "ADMIN" | "SUPER_ADMIN",
  });

  useEffect(() => {
    fetchUsers();
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

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ name: "", password: "", role: "ADMIN" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({ name: user.name, password: "", role: user.role });
    setIsDialogOpen(true);
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
      };
      if (editingUser) body.id = editingUser.id;
      if (formData.password) body.password = formData.password;

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
      setFormData({ name: "", password: "", role: "ADMIN" });
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
        <Badge variant={user.role === "SUPER_ADMIN" ? "default" : "secondary"}>
          {user.role}
        </Badge>
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
          <h1 className="text-3xl font-bold text-slate-900">Admin Users</h1>
          <p className="text-slate-500 mt-1">Manage admin accounts</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-yellow-500 hover:bg-yellow-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Admin User
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name..."
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
          <DataTable data={users} columns={columns} searchPlaceholder="Search users..." />
          <p className="text-sm text-slate-500">Total: {total} users</p>
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
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "SUPER_ADMIN" })}
                className="w-full p-2 border rounded-md"
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600">{editingUser ? "Update" : "Create"}</Button>
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
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}