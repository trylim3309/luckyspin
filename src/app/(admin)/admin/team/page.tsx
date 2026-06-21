"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { Plus, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import useSWR from "swr";

interface Team {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

const defaultTeams = [
  { id: "1", name: "KING88", code: "KING88", description: "King88 Team", isActive: true, createdAt: new Date().toISOString() },
  { id: "2", name: "SKY24", code: "SKY24", description: "Sky24 Team", isActive: true, createdAt: new Date().toISOString() },
  { id: "3", name: "B88", code: "B88", description: "B88 Team", isActive: true, createdAt: new Date().toISOString() },
];

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });

  const handleOpenDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        code: team.code,
        description: team.description || "",
        isActive: team.isActive,
      });
    } else {
      setEditingTeam(null);
      setFormData({ name: "", code: "", description: "", isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert("Name and Code are required");
      return;
    }

    if (editingTeam) {
      setTeams(teams.map(t => t.id === editingTeam.id ? { ...t, ...formData } : t));
    } else {
      setTeams([...teams, { id: Date.now().toString(), ...formData, createdAt: new Date().toISOString() }]);
    }
    setIsDialogOpen(false);
  };

  const handleToggle = (team: Team) => {
    setTeams(teams.map(t => t.id === team.id ? { ...t, isActive: !t.isActive } : t));
  };

  const getColorBadge = (code: string) => {
    const colors: Record<string, string> = {
      KING88: "bg-purple-500",
      SKY24: "bg-blue-500",
      B88: "bg-orange-500",
    };
    return <Badge className={colors[code] || "bg-gray-500"}>{code}</Badge>;
  };

  const columns = [
    {
      key: "code",
      label: "Team",
      render: (team: Team) => (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.code === "KING88" ? "#9333EA" : team.code === "SKY24" ? "#3B82F6" : "#F97316" }} />
          <span className="font-medium">{team.code}</span>
        </div>
      ),
    },
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    {
      key: "isActive",
      label: "Status",
      render: (team: Team) => (
        <Badge variant={team.isActive ? "default" : "secondary"}>
          {team.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (team: Team) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggle(team)}
            className="p-1 hover:bg-slate-100 rounded"
            title={team.isActive ? "Deactivate" : "Activate"}
          >
            {team.isActive ? (
              <ToggleRight className="w-5 h-5 text-green-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => handleOpenDialog(team)}
            className="p-1 hover:bg-slate-100 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#233446]">Team Management</h1>
          <p className="text-[#868D9E] mt-1">Manage your teams</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="h-10 rounded-lg text-white font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)" }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team
        </Button>
      </div>

      <DataTable data={teams} columns={columns} onEdit={handleOpenDialog} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Add New Team"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Code</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. KING88"
                disabled={!!editingTeam}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Team name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Team description"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm font-medium">Active</label>
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
              {editingTeam ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}