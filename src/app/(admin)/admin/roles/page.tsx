"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

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

const PERMISSIONS = [
  { key: "prizes", label: "Prizes Management", description: "Create, edit, delete prizes" },
  { key: "conditions", label: "Spin Conditions", description: "Manage spin rules and limits" },
  { key: "result_control", label: "Result Control", description: "Override spin outcomes" },
  { key: "users", label: "Accounts", description: "Manage admin user accounts" },
  { key: "spin_history", label: "Spin History", description: "View all spin records" },
  { key: "promotions", label: "Promotions", description: "Manage promotional campaigns" },
  { key: "team", label: "Team Management", description: "View team stats and leaderboard" },
  { key: "settings", label: "Settings", description: "Configure system settings" },
  { key: "customers", label: "Customers", description: "Manage customer CRM" },
];

export default function RolesPage() {
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    const res = await fetch("/api/admin/roles");
    const data = await res.json();
    setRolePermissions(data.roles);
  };

  const handleTogglePermission = (permissionKey: string) => {
    if (!selectedRole) return;

    const current = rolePermissions[selectedRole] || [];
    const updated = current.includes(permissionKey)
      ? current.filter(p => p !== permissionKey)
      : [...current, permissionKey];

    setRolePermissions({
      ...rolePermissions,
      [selectedRole]: updated,
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    try {
      await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          permissions: rolePermissions[selectedRole] || [],
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPermissions = selectedRole ? (rolePermissions[selectedRole] || []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#233446]">Role Permissions</h1>
        <p className="text-[#868D9E] mt-1">Configure default permissions for each role</p>
      </div>

      <div className="flex gap-6">
        {/* Role List */}
        <Card className="w-64 flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#868D9E]">Select Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedRole === role
                    ? "bg-[#6D41D7] text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                <div className="font-medium text-sm">{ROLE_LABELS[role]}</div>
                <div className={`text-xs ${
                  selectedRole === role ? "text-white/70" : "text-[#868D9E]"
                }`}>
                  {rolePermissions[role]?.length || 0} permissions
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Permissions Panel */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">
                {selectedRole ? ROLE_LABELS[selectedRole] : "Select a role"}
              </CardTitle>
              {selectedRole && (
                <Badge
                  className="mt-1"
                  style={{
                    backgroundColor: ROLE_COLORS[selectedRole] + "20",
                    color: ROLE_COLORS[selectedRole],
                  }}
                >
                  {selectedPermissions.length} permissions assigned
                </Badge>
              )}
            </div>
            {selectedRole && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-[#6D41D7] to-[#8B5CF6] text-white hover:opacity-90"
              >
                {isSaving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {selectedRole ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PERMISSIONS.map((perm) => (
                  <label
                    key={perm.key}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedPermissions.includes(perm.key)
                        ? "border-[#6D41D7] bg-[#6D41D7]/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Checkbox
                      checked={selectedPermissions.includes(perm.key)}
                      onCheckedChange={() => handleTogglePermission(perm.key)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-sm">{perm.label}</div>
                      <div className="text-xs text-[#868D9E]">{perm.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#868D9E]">
                Select a role from the left to edit its permissions
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
