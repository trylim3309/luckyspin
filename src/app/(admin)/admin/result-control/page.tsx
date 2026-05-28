"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { Plus, Edit, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ResultControl {
  id: string;
  mode: string;
  globalWinPercentage: number;
  globalLosePercentage: number;
  forcedPrizeId: string | null;
  targetTelegramId: string | null;
  forceWin: boolean;
  forceLose: boolean;
  blockBigPrize: boolean;
  isActive: boolean;
  prize: { id: string; name: string; type: string } | null;
}

interface Prize {
  id: string;
  name: string;
  type: string;
}

export default function ResultControlPage() {
  const [controls, setControls] = useState<ResultControl[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<ResultControl | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingControl, setDeletingControl] = useState<ResultControl | null>(null);
  const [formData, setFormData] = useState({
    mode: "RANDOM",
    globalWinPercentage: 100,
    globalLosePercentage: 0,
    forcedPrizeId: "",
    targetTelegramId: "",
    forceWin: false,
    forceLose: false,
    blockBigPrize: false,
    isActive: true,
  });

  useEffect(() => {
    fetchControls();
    fetchPrizes();
  }, []);

  const fetchControls = async () => {
    try {
      const response = await fetch("/api/admin/result-control", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setControls(data.controls);
      }
    } catch (error) {
      console.error("Failed to fetch controls:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrizes = async () => {
    try {
      const response = await fetch("/api/admin/prizes", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setPrizes(data.prizes);
      }
    } catch (error) {
      console.error("Failed to fetch prizes:", error);
    }
  };

  const handleOpenDialog = (control?: ResultControl) => {
    if (control) {
      setEditingControl(control);
      setFormData({
        mode: control.mode,
        globalWinPercentage: control.globalWinPercentage,
        globalLosePercentage: control.globalLosePercentage,
        forcedPrizeId: control.forcedPrizeId || "",
        targetTelegramId: control.targetTelegramId || "",
        forceWin: control.forceWin,
        forceLose: control.forceLose,
        blockBigPrize: control.blockBigPrize,
        isActive: control.isActive,
      });
    } else {
      setEditingControl(null);
      setFormData({
        mode: "RANDOM",
        globalWinPercentage: 100,
        globalLosePercentage: 0,
        forcedPrizeId: "",
        targetTelegramId: "",
        forceWin: false,
        forceLose: false,
        blockBigPrize: false,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (control: ResultControl) => {
    setDeletingControl(control);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingControl ? "/api/admin/result-control" : "/api/admin/result-control";
      const method = editingControl ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingControl
            ? { id: editingControl.id, ...formData }
            : { ...formData, forcedPrizeId: formData.forcedPrizeId || null, targetTelegramId: formData.targetTelegramId || null }
        ),
        credentials: "include",
      });

      if (response.ok) {
        fetchControls();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to save control:", error);
    }
  };

  const handleToggleActive = async (control: ResultControl) => {
    try {
      await fetch("/api/admin/result-control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: control.id, isActive: !control.isActive }),
        credentials: "include",
      });
      fetchControls();
    } catch (error) {
      console.error("Failed to toggle control:", error);
    }
  };

  const handleDelete = async () => {
    if (!deletingControl) return;
    try {
      await fetch(`/api/admin/result-control?id=${deletingControl.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setIsDeleteDialogOpen(false);
      fetchControls();
    } catch (error) {
      console.error("Failed to delete control:", error);
    }
  };

  const columns = [
    {
      key: "mode",
      label: "Mode",
      render: (c: ResultControl) => (
        <Badge variant="outline" className="font-mono">
          {c.mode}
        </Badge>
      ),
    },
    {
      key: "globalWinPercentage",
      label: "Win %",
      render: (c: ResultControl) => `${c.globalWinPercentage}%`,
    },
    {
      key: "targetTelegramId",
      label: "Target User",
      render: (c: ResultControl) => c.targetTelegramId || "All users",
    },
    {
      key: "forcedPrize",
      label: "Forced Prize",
      render: (c: ResultControl) => c.prize?.name || "None",
    },
    {
      key: "forceWin",
      label: "Force Win",
      render: (c: ResultControl) => (c.forceWin ? "✅" : "❌"),
    },
    {
      key: "forceLose",
      label: "Force Lose",
      render: (c: ResultControl) => (c.forceLose ? "✅" : "❌"),
    },
    {
      key: "isActive",
      label: "Status",
      render: (c: ResultControl) => (
        <Badge variant={c.isActive ? "default" : "secondary"}>
          {c.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (c: ResultControl) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(c)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant={c.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => handleToggleActive(c)}
          >
            {c.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleOpenDelete(c)}>
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
          <h1 className="text-3xl font-bold text-slate-900">Result Control</h1>
          <p className="text-slate-500 mt-1">Control spin outcomes and prize distribution</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-yellow-500 hover:bg-yellow-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Control Rule
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable data={controls} columns={columns} />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingControl ? "Edit Control Rule" : "Add Result Control Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Control Mode</label>
              <Select value={formData.mode} onValueChange={(val) => setFormData({ ...formData, mode: val || "RANDOM" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RANDOM">Random by Probability</SelectItem>
                  <SelectItem value="ADMIN_CONTROL">Admin Control</SelectItem>
                  <SelectItem value="FORCE_WIN">Force Win</SelectItem>
                  <SelectItem value="FORCE_LOSE">Force Lose</SelectItem>
                  <SelectItem value="USER_SPECIFIC">User Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Global Win %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.globalWinPercentage}
                  onChange={(e) => setFormData({ ...formData, globalWinPercentage: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Global Lose %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.globalLosePercentage}
                  onChange={(e) => setFormData({ ...formData, globalLosePercentage: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Telegram ID (optional)</label>
              <Input
                value={formData.targetTelegramId}
                onChange={(e) => setFormData({ ...formData, targetTelegramId: e.target.value })}
                placeholder="Specific user Telegram ID"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Forced Prize (optional)</label>
              <Select value={formData.forcedPrizeId} onValueChange={(val) => setFormData({ ...formData, forcedPrizeId: val || "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a prize" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {prizes.map((prize) => (
                    <SelectItem key={prize.id} value={prize.id}>
                      {prize.name} ({prize.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forceWin"
                  checked={formData.forceWin}
                  onChange={(e) => setFormData({ ...formData, forceWin: e.target.checked })}
                />
                <label htmlFor="forceWin" className="text-sm font-medium">Force Win (always win)</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forceLose"
                  checked={formData.forceLose}
                  onChange={(e) => setFormData({ ...formData, forceLose: e.target.checked })}
                />
                <label htmlFor="forceLose" className="text-sm font-medium">Force Lose (always lose)</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="blockBigPrize"
                  checked={formData.blockBigPrize}
                  onChange={(e) => setFormData({ ...formData, blockBigPrize: e.target.checked })}
                />
                <label htmlFor="blockBigPrize" className="text-sm font-medium">Block Big Prizes</label>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600">
              {editingControl ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Control Rule</DialogTitle>
          </DialogHeader>
          {deletingControl && (
            <p className="text-slate-600">
              Are you sure you want to delete this control rule?
              <br />
              <span className="font-medium">{deletingControl.mode} - {deletingControl.prize?.name || "All prizes"}</span>
            </p>
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