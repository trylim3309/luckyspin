"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Clock, ToggleLeft, ToggleRight, X, Check } from "lucide-react";
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

export default function PromotionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<{ promotions: Promotion[] }>(`/api/admin/promotions?id=${params.id}`, fetcher);
  const promotion = data?.promotions?.[0];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  useEffect(() => {
    if (promotion) {
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
    }
  }, [promotion]);

  const handleSave = async () => {
    if (!promotion) return;
    if (!formData.title.trim() || !formData.startDate || !formData.endDate) {
      alert("Title, start date, and end date are required");
      return;
    }

    try {
      const response = await fetch("/api/admin/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promotion.id, ...formData }),
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

  const handleToggleActive = async () => {
    if (!promotion) return;
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

  const handleClosePromotion = async () => {
    if (!promotion) return;
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

  const getStatusBadge = () => {
    if (!promotion) return null;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#6D41D7] border-t-transparent" />
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-[#868D9E] mb-4">Promotion not found</p>
        <Button onClick={() => router.back()} variant="outline" className="h-10 rounded-lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#233446]" />
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#233446]">{promotion.title}</h1>
            {getTeamBadge(promotion.team)}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={handleToggleActive}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
            title={promotion.isActive ? "Deactivate" : "Activate"}
          >
            {promotion.isActive ? (
              <>
                <ToggleRight className="w-5 h-5 text-green-600" />
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-slate-400" />
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Inactive</span>
              </>
            )}
          </button>
          <button
            onClick={handleClosePromotion}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
            title={promotion.isClosed ? "Reopen" : "Close"}
          >
            {promotion.isClosed ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-green-600 hidden sm:inline">Reopen</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5 text-red-500" />
                <span className="text-xs sm:text-sm font-medium text-red-500 hidden sm:inline">Close</span>
              </>
            )}
          </button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="h-10 rounded-lg text-white font-medium transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)" }}
          >
            <Edit className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Edit</span>
          </Button>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Image */}
          {promotion.imageUrl && (
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <img
                src={promotion.imageUrl}
                alt={promotion.title}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover"
              />
            </div>
          )}

          {/* Info Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-8 w-full">
            <div>
              <p className="text-xs sm:text-sm text-[#868D9E]">Status</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-[#868D9E]">Type</p>
              <p className="mt-1 font-medium text-[#233446]">{promotion.type}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-[#868D9E]">Discount</p>
              <p className="mt-1 font-medium text-[#233446]">
                {promotion.type === "DISCOUNT" ? `${promotion.discount}%` : `$${promotion.discount}`}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-[#868D9E]">Period</p>
              <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-[#233446]">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs sm:text-sm text-[#868D9E]">Captions</p>
              <p className="mt-1 text-[#233446] whitespace-pre-wrap text-sm">
                {promotion.description || "No description"}
              </p>
            </div>
            {promotion.remarks && (
              <div className="sm:col-span-2">
                <p className="text-xs sm:text-sm text-[#868D9E]">Remarks</p>
                <p className="mt-1 text-[#233446] whitespace-pre-wrap text-sm">
                  {promotion.remarks}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs sm:text-sm text-[#868D9E]">Created</p>
              <p className="mt-1 text-xs sm:text-sm text-[#233446]">{formatDate(promotion.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
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
                rows={6}
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
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}