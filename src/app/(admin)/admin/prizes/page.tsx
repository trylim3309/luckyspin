"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { Plus, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useSWR from "swr";

interface Prize {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string;
  value: number;
  type: string;
  stock: number;
  unlimitedStock: boolean;
  probability: number;
  isActive: boolean;
  displayOrder: number;
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export default function PrizesPage() {
  const { data, isLoading, mutate } = useSWR<{ prizes: Prize[] }>("/api/admin/prizes", fetcher);
  const prizes = data?.prizes || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", imageUrl: "", color: "#ffffff", value: 0, type: "MONEY",
    stock: 0, unlimitedStock: false, probability: 0, isActive: true, displayOrder: 0,
  });

  const handleOpenDialog = (prize?: Prize) => {
    if (prize) {
      setEditingPrize(prize);
      setFormData({
        name: prize.name,
        description: prize.description || "",
        imageUrl: prize.imageUrl || "",
        color: prize.color,
        value: prize.value,
        type: prize.type,
        stock: prize.stock,
        unlimitedStock: (prize as any).unlimitedStock || false,
        probability: prize.probability,
        isActive: prize.isActive,
        displayOrder: prize.displayOrder,
      });
    } else {
      setEditingPrize(null);
      setFormData({
        name: "",
        description: "",
        imageUrl: "",
        color: "#ffffff",
        value: 0,
        type: "MONEY",
        stock: 0,
        unlimitedStock: false,
        probability: 0,
        isActive: true,
        displayOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Prize name is required");
      return;
    }

    try {
      const url = editingPrize ? "/api/admin/prizes" : "/api/admin/prizes";
      const method = editingPrize ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPrize ? { id: editingPrize.id, ...formData } : formData),
        credentials: "include",
      });

      if (response.ok) {
        mutate();
        setIsDialogOpen(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save prize");
      }
    } catch (error) {
      console.error("Failed to save prize:", error);
      alert("Failed to save prize");
    }
  };

  const handleToggleActive = async (prize: Prize) => {
    try {
      await fetch("/api/admin/prizes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: prize.id, isActive: !prize.isActive }),
        credentials: "include",
      });
      mutate();
    } catch (error) {
      console.error("Failed to toggle prize:", error);
    }
  };

  const columns = [
    {
      key: "image",
      label: "Image",
      render: (prize: Prize) => (
        prize.imageUrl ? (
          <img
            src={prize.imageUrl}
            alt={prize.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full" style={{ backgroundColor: prize.color }} />
        )
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (prize: Prize) => (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prize.color }} />
          <span className="font-medium">{prize.name}</span>
        </div>
      ),
    },
    { key: "type", label: "Type" },
    { key: "value", label: "Value", render: (prize: Prize) => `$${prize.value}` },
    { key: "stock", label: "Stock" },
    { key: "probability", label: "Prob%", render: (prize: Prize) => `${prize.probability}%` },
    { key: "displayOrder", label: "Order", render: (prize: Prize) => prize.displayOrder },
    {
      key: "isActive",
      label: "Status",
      render: (prize: Prize) => (
        <Badge variant={prize.isActive ? "default" : "secondary"}>
          {prize.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Prize Management</h1>
          <p className="text-slate-500 mt-1">Manage your spin wheel prizes</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-yellow-500 hover:bg-yellow-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Prize
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable
          data={prizes}
          columns={columns}
          onEdit={handleOpenDialog}
          onDelete={async (prize) => {
            if (confirm(`Delete prize "${prize.name}"?`)) {
              try {
                const res = await fetch(`/api/admin/prizes?id=${prize.id}`, {
                  method: "DELETE",
                  credentials: "include",
                });
                if (res.ok) {
                  mutate();
                } else {
                  const data = await res.json();
                  alert(data.error || "Failed to delete prize");
                }
              } catch (error) {
                console.error("Delete error:", error);
                alert("Failed to delete prize");
              }
            }
          }}
        />
      )}

      {/* Add/Edit Prize Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrize ? "Edit Prize" : "Add New Prize"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Prize name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Prize description"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image</label>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-yellow-500 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("prize-image-upload")?.click()}
                >
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-2xl">+</span>
                  )}
                </div>
                <input
                  id="prize-image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      alert("Image too large. Please use an image under 5MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) {
                        setFormData({ ...formData, imageUrl: ev.target.result as string });
                      }
                    };
                    reader.onerror = () => {
                      alert("Failed to read image file. Please try another file.");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {formData.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: "" })}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value || "MONEY" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONEY">Money</SelectItem>
                    <SelectItem value="COUPON">Coupon</SelectItem>
                    <SelectItem value="PRODUCT">Product</SelectItem>
                    <SelectItem value="FREE_SPIN">Free Spin</SelectItem>
                    <SelectItem value="EMPTY">Empty/No Win</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Value ($)</label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock</label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Probability %</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Order</label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="unlimitedStock"
                checked={formData.unlimitedStock || false}
                onChange={(e) => setFormData({ ...formData, unlimitedStock: e.target.checked })}
              />
              <label htmlFor="unlimitedStock" className="text-sm font-medium">Unlimited Stock</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600">
              {editingPrize ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}