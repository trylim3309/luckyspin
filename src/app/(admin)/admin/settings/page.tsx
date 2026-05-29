"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CampaignSetting {
  id: string;
  name: string;
  title: string;
  subtitle: string | null;
  themeColor: string;
  wheelLogoUrl: string | null;
  isActive: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CampaignSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        if (data.settings?.wheelLogoUrl) {
          setPreview(data.settings.wheelLogoUrl);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: settings.id, wheelLogoUrl: preview || "" }),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        alert("Saved!");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Wheel Logo</h1>
        <p className="text-slate-500 mt-1">Upload a logo to display in the center of the wheel</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 max-w-xl space-y-6">
        <div className="space-y-2">
          <Label>Upload Image</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
          />
          <p className="text-sm text-slate-500">PNG, JPG, or WebP. Recommended 200x200px. Max 2MB.</p>
        </div>

        <div className="space-y-2">
          <Label>Or paste image URL</Label>
          <Input
            value={preview?.startsWith("data:") ? "" : preview || ""}
            onChange={(e) => setPreview(e.target.value)}
            placeholder="https://example.com/logo.png"
            disabled={!!preview?.startsWith("data:")}
          />
        </div>

        {preview && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="w-24 h-24 rounded-full border-4 border-yellow-400 overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={preview}
                alt="Logo preview"
                className="w-full h-full object-contain"
                onError={() => setPreview(null)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleRemove} className="text-red-500">
              Remove Logo
            </Button>
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="bg-yellow-500 hover:bg-yellow-600">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
