"use client";

import { useEffect, useState } from "react";
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
  const [formData, setFormData] = useState({
    wheelLogoUrl: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        if (data.settings) {
          setFormData({ wheelLogoUrl: data.settings.wheelLogoUrl || "" });
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: settings.id, wheelLogoUrl: formData.wheelLogoUrl }),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
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
        <h1 className="text-3xl font-bold text-slate-900">Campaign Settings</h1>
        <p className="text-slate-500 mt-1">Configure your wheel appearance</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 max-w-xl space-y-6">
        <div className="space-y-2">
          <Label>Wheel Center Logo URL</Label>
          <Input
            value={formData.wheelLogoUrl}
            onChange={(e) => setFormData({ ...formData, wheelLogoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
          <p className="text-sm text-slate-500">
            URL to an image (PNG/JPG, recommended 200x200px). Leave empty to use default text.
          </p>
        </div>

        {formData.wheelLogoUrl && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="w-20 h-20 rounded-full border-4 border-yellow-400 overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={formData.wheelLogoUrl}
                alt="Logo preview"
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="bg-yellow-500 hover:bg-yellow-600">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
