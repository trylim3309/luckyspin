"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { Plus, Edit, Trash2, X, Check, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useSWR from "swr";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  remarks: string | null;
  imageUrl: string | null;
  type: string;
  discount: number;
  team: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export default function PromotionsPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<{ promotions: Promotion[] }>("/api/admin/promotions", fetcher);
  const promotions = data?.promotions || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  const filteredPromotions = filterTeam === "all"
    ? promotions
    : promotions.filter(p => p.team === filterTeam);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    remarks: "",
    imageUrl: "",
    type: "DISCOUNT",
    discount: 0,
    team: "KING88",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const handleOpenDialog = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        title: promotion.title,
        description: promotion.description || "",
        remarks: promotion.remarks || "",
        imageUrl: promotion.imageUrl || "",
        type: promotion.type,
        discount: promotion.discount,
        team: promotion.team,
        startDate: promotion.startDate.split("T")[0],
        endDate: promotion.endDate.split("T")[0],
        isActive: promotion.isActive,
      });
    } else {
      setEditingPromotion(null);
      const today = new Date().toISOString().split("T")[0];
      setFormData({
        title: "",
        description: "",
        remarks: "",
        imageUrl: "",
        type: "DISCOUNT",
        discount: 0,
        team: "KING88",
        startDate: today,
        endDate: today,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.startDate || !formData.endDate) {
      alert("Title, start date, and end date are required");
      return;
    }

    try {
      const url = editingPromotion ? "/api/admin/promotions" : "/api/admin/promotions";
      const method = editingPromotion ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPromotion ? { id: editingPromotion.id, ...formData } : formData),
        credentials: "include",
      });

      if (response.ok) {
        mutate();
        setIsDialogOpen(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save promotion");
      }
    } catch (error) {
      console.error("Failed to save promotion:", error);
      alert("Failed to save promotion");
    }
  };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      await fetch("/api/admin/promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promotion.id, isActive: !promotion.isActive }),
        credentials: "include",
      });
      mutate();
    } catch (error) {
      console.error("Failed to toggle promotion:", error);
    }
  };

  const handleClosePromotion = async (promotion: Promotion) => {
    try {
      await fetch("/api/admin/promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promotion.id, isClosed: !promotion.isClosed }),
        credentials: "include",
      });
      mutate();
    } catch (error) {
      console.error("Failed to close promotion:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const getStatusBadge = (promotion: Promotion) => {
    if (promotion.isClosed) {
      return <Badge className="bg-red-500">Closed</Badge>;
    }
    if (!promotion.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    if (now < startDate) {
      return <Badge className="bg-blue-500">Upcoming</Badge>;
    }
    if (now > endDate) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  const getTeamBadge = (team: string) => {
    const colors: Record<string, string> = {
      KING88: "bg-purple-500",
      SKY24: "bg-blue-500",
      B88: "bg-orange-500",
    };
    return <Badge className={colors[team] || "bg-gray-500"}>{team}</Badge>;
  };

  const columns = [
    {
      key: "image",
      label: "Image",
      render: (promotion: Promotion) => (
        <button
          onClick={() => router.push(`/admin/promotions/${promotion.id}`)}
          className="hover:opacity-80 transition-opacity"
        >
          {promotion.imageUrl ? (
            <img src={promotion.imageUrl} alt={promotion.title} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-200" />
          )}
        </button>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (promotion: Promotion) => (
        <button
          onClick={() => router.push(`/admin/promotions/${promotion.id}`)}
          className="text-left hover:text-purple-600 transition-colors font-medium"
        >
          {promotion.title}
        </button>
      ),
    },
    { key: "type", label: "Type" },
    {
      key: "team",
      label: "Team",
      render: (promotion: Promotion) => getTeamBadge(promotion.team),
    },
    {
      key: "discount",
      label: "Discount",
      render: (promotion: Promotion) =>
        promotion.type === "DISCOUNT" ? `${promotion.discount}%` : `$${promotion.discount}`,
    },
    {
      key: "dates",
      label: "Period",
      render: (promotion: Promotion) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="w-3 h-3" />
          {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (promotion: Promotion) => getStatusBadge(promotion),
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (promotion: Promotion) => (
        <span className="text-sm text-gray-500 truncate max-w-[150px] block" title={promotion.remarks || ""}>
          {promotion.remarks || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (promotion: Promotion) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleActive(promotion)}
            className="p-1 hover:bg-slate-100 rounded"
            title={promotion.isActive ? "Deactivate" : "Activate"}
          >
            {promotion.isActive ? (
              <ToggleRight className="w-5 h-5 text-green-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => handleClosePromotion(promotion)}
            className="p-1 hover:bg-slate-100 rounded"
            title={promotion.isClosed ? "Reopen" : "Close"}
          >
            {promotion.isClosed ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
          </button>
          <button
            onClick={() => handleOpenDialog(promotion)}
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
          <h1 className="text-2xl font-bold text-[#233446]">Promotions</h1>
          <p className="text-[#868D9E] mt-1">Manage your marketing promotions</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterTeam} onValueChange={(value) => setFilterTeam(value || "all")}>
            <SelectTrigger style={{ width: 160 }}>
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="KING88">KING88</SelectItem>
              <SelectItem value="SKY24">SKY24</SelectItem>
              <SelectItem value="B88">B88</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => handleOpenDialog()}
            className="h-10 rounded-lg text-white font-medium transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Promotion
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#6D41D7] border-t-transparent" />
        </div>
      ) : (
        <DataTable
          data={filteredPromotions}
          columns={columns}
          onEdit={handleOpenDialog}
          onDelete={async (promotion) => {
            if (confirm(`Delete promotion "${promotion.title}"?`)) {
              try {
                const res = await fetch(`/api/admin/promotions?id=${promotion.id}`, {
                  method: "DELETE",
                  credentials: "include",
                });
                if (res.ok) {
                  mutate();
                } else {
                  const data = await res.json();
                  alert(data.error || "Failed to delete promotion");
                }
              } catch (error) {
                console.error("Delete error:", error);
                alert("Failed to delete promotion");
              }
            }
          }}
        />
      )}

      {/* Add/Edit Promotion Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPromotion ? "Edit Promotion" : "Add New Promotion"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Promotion title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Captions</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Promotion description"
                rows={4}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6D41D7] focus:border-transparent resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Internal notes or remarks"
                rows={3}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6D41D7] focus:border-transparent resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image</label>
              <div className="flex items-center gap-4">
                <div
                  className="w-24 h-24 rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-purple-500 transition-colors cursor-pointer overflow-hidden"
                  onClick={() => document.getElementById("promotion-image-upload")?.click()}
                >
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-2xl">+</span>
                  )}
                </div>
                <input
                  id="promotion-image-upload"
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team</label>
                <Select value={formData.team} onValueChange={(value) => setFormData({ ...formData, team: value || "KING88" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KING88">KING88</SelectItem>
                    <SelectItem value="SKY24">SKY24</SelectItem>
                    <SelectItem value="B88">B88</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value || "DISCOUNT" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISCOUNT">Discount</SelectItem>
                    <SelectItem value="FREE_SPIN">Free Spin</SelectItem>
                    <SelectItem value="CASHBACK">Cashback</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Discount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date *</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date *</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
              {editingPromotion ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}