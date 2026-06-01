"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import useSWR from "swr";

interface SpinCondition {
  id: string;
  name: string;
  spinType: "FIXED" | "DAILY";
  maxSpins: number;
  maxSpinsPerDay: number;
  minBalanceRequired: number;
  zeroBalanceCanSpin: boolean;
  freeSpinEnabled: boolean;
  winCooldownMinutes: number;
  isActive: boolean;
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export default function ConditionsPage() {
  const { data, isLoading, mutate } = useSWR<{ conditions: SpinCondition[] }>("/api/admin/conditions", fetcher);
  const conditions = data?.conditions || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<SpinCondition | null>(null);
  const [formData, setFormData] = useState({
    name: "", spinType: "FIXED" as "FIXED" | "DAILY", maxSpins: 10, maxSpinsPerDay: 10,
    minBalanceRequired: 0, zeroBalanceCanSpin: false, freeSpinEnabled: true, winCooldownMinutes: 0, isActive: true,
  });

  const handleOpenDialog = (condition?: SpinCondition) => {
    if (condition) {
      setEditingCondition(condition);
      setFormData({
        name: condition.name,
        spinType: (condition as any).spinType || "FIXED",
        maxSpins: (condition as any).maxSpins || 0,
        maxSpinsPerDay: condition.maxSpinsPerDay,
        minBalanceRequired: condition.minBalanceRequired,
        zeroBalanceCanSpin: condition.zeroBalanceCanSpin,
        freeSpinEnabled: condition.freeSpinEnabled,
        winCooldownMinutes: condition.winCooldownMinutes,
        isActive: condition.isActive,
      });
    } else {
      setEditingCondition(null);
      setFormData({
        name: "",
        spinType: "FIXED",
        maxSpins: 10,
        maxSpinsPerDay: 10,
        minBalanceRequired: 0,
        zeroBalanceCanSpin: false,
        freeSpinEnabled: true,
        winCooldownMinutes: 0,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingCondition ? "/api/admin/conditions" : "/api/admin/conditions";
      const method = editingCondition ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCondition ? { id: editingCondition.id, ...formData } : formData),
        credentials: "include",
      });

      if (response.ok) {
        mutate();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to save condition:", error);
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "spinType",
      label: "Spin Type",
      render: (c: SpinCondition) => c.spinType === "FIXED" ? "Fixed Spins" : "Daily Spins",
    },
    {
      key: "maxSpins",
      label: "Spins",
      render: (c: SpinCondition) => c.spinType === "FIXED" ? (c.maxSpins || 0) : c.maxSpinsPerDay,
    },
    {
      key: "minBalanceRequired",
      label: "Min Balance",
      render: (c: SpinCondition) => `$${c.minBalanceRequired}`,
    },
    {
      key: "zeroBalanceCanSpin",
      label: "Zero Balance",
      render: (c: SpinCondition) => (c.zeroBalanceCanSpin ? "✅" : "❌"),
    },
    {
      key: "freeSpinEnabled",
      label: "Free Spin",
      render: (c: SpinCondition) => (c.freeSpinEnabled ? "✅" : "❌"),
    },
    {
      key: "winCooldownMinutes",
      label: "Cooldown",
      render: (c: SpinCondition) => (c.winCooldownMinutes ? `${c.winCooldownMinutes}m` : "None"),
    },
    {
      key: "isActive",
      label: "Status",
      render: (c: SpinCondition) => (
        <Badge variant={c.isActive ? "default" : "secondary"}>
          {c.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Spin Conditions</h1>
          <p className="text-slate-500 mt-1">Control when and how users can spin</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-yellow-500 hover:bg-yellow-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable
          data={conditions}
          columns={columns}
          onEdit={handleOpenDialog}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCondition ? "Edit Condition" : "Add New Condition"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Condition name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Spin Type</label>
                <Select
                  value={formData.spinType}
                  onValueChange={(value) => setFormData({ ...formData, spinType: value as "FIXED" | "DAILY" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Spins</SelectItem>
                    <SelectItem value="DAILY">Daily Spins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.spinType === "FIXED" ? "Total Spins" : "Spins Per Day"}
                </label>
                <Input
                  type="number"
                  value={formData.spinType === "FIXED" ? formData.maxSpins : formData.maxSpinsPerDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (formData.spinType === "FIXED") {
                      setFormData({ ...formData, maxSpins: val });
                    } else {
                      setFormData({ ...formData, maxSpinsPerDay: val });
                    }
                  }}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Balance Required ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.minBalanceRequired}
                onChange={(e) => setFormData({ ...formData, minBalanceRequired: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Win Cooldown (minutes)</label>
                <Input
                  type="number"
                  value={formData.winCooldownMinutes}
                  onChange={(e) => setFormData({ ...formData, winCooldownMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="zeroBalanceCanSpin"
                  checked={formData.zeroBalanceCanSpin}
                  onChange={(e) => setFormData({ ...formData, zeroBalanceCanSpin: e.target.checked })}
                />
                <label htmlFor="zeroBalanceCanSpin" className="text-sm font-medium">
                  Allow spin with zero balance
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="freeSpinEnabled"
                  checked={formData.freeSpinEnabled}
                  onChange={(e) => setFormData({ ...formData, freeSpinEnabled: e.target.checked })}
                />
                <label htmlFor="freeSpinEnabled" className="text-sm font-medium">
                  Enable free spin
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Active
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600">
              {editingCondition ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}