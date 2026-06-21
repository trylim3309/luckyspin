"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, X } from "lucide-react";

interface CampaignSetting {
  id: string;
  name: string;
  title: string;
  subtitle: string | null;
  themeColor: string;
  wheelLogoUrl: string | null;
  adminLogoUrl: string | null;
  isActive: boolean;
}

interface UploadButtonProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
}

function UploadButton({ onChange, accept = "image/*" }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          background: "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(109, 65, 215, 0.3)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(109, 65, 215, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(109, 65, 215, 0.3)";
        }}
      >
        <Upload style={{ width: "18px", height: "18px" }} />
        Choose File
      </button>
    </>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CampaignSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wheelPreview, setWheelPreview] = useState<string | null>(null);
  const [adminPreview, setAdminPreview] = useState<string | null>(null);
  const wheelFileName = useRef<string>("");
  const adminFileName = useRef<string>("");

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
          setWheelPreview(data.settings.wheelLogoUrl);
        }
        if (data.settings?.adminLogoUrl) {
          setAdminPreview(data.settings.adminLogoUrl);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "wheel" | "admin"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (type === "wheel") {
        setWheelPreview(result);
        wheelFileName.current = file.name;
      } else {
        setAdminPreview(result);
        adminFileName.current = file.name;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!settings) {
      alert("Settings not loaded yet. Please wait and try again.");
      return;
    }
    setIsSaving(true);
    try {
      console.log("Saving with id:", settings.id);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settings.id,
          wheelLogoUrl: wheelPreview || "",
          adminLogoUrl: adminPreview || "",
        }),
        credentials: "include",
      });
      const data = await response.json();
      console.log("Save response:", response.status, data);
      if (response.ok) {
        setSettings(data.settings);
        alert("Saved!");
      } else {
        alert(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = (type: "wheel" | "admin") => {
    if (type === "wheel") {
      setWheelPreview(null);
      wheelFileName.current = "";
    } else {
      setAdminPreview(null);
      adminFileName.current = "";
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "384px",
        }}
      >
        <div
          className="spin"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "3px solid rgba(109, 65, 215, 0.3)",
            borderTopColor: "#6D41D7",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wheel Logo Section */}
      <div>
        <h1 className="text-2xl font-bold text-[#233446]">Wheel Logo</h1>
        <p className="text-[#868D9E] mt-1">
          Upload a logo to display in the center of the wheel
        </p>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          padding: "24px",
          maxWidth: "600px",
          marginBottom: "32px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#233446", marginBottom: "12px" }}>
            Upload Image
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <UploadButton onChange={(e) => handleFileChange(e, "wheel")} />
            {wheelPreview && (
              <span style={{ fontSize: "13px", color: "#6D41D7", fontWeight: 500 }}>
                ✓ Image selected
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#868D9E", marginTop: "12px" }}>
            PNG, JPG, or WebP. Recommended 200x200px. Max 2MB.
          </p>
        </div>

        {wheelPreview && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#233446", marginBottom: "12px" }}>
              Preview
            </p>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "3px solid #6D41D7",
                overflow: "hidden",
                background: "#F5F5F5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <img
                src={wheelPreview}
                alt="Wheel Logo preview"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={() => setWheelPreview(null)}
              />
            </div>
            <button
              onClick={() => handleRemove("wheel")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "transparent",
                color: "#DC2626",
                border: "1px solid #FECACA",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FEF2F2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X style={{ width: "14px", height: "14px" }} />
              Remove Logo
            </button>
          </div>
        )}
      </div>

      {/* Admin Logo Section */}
      <div>
        <h1 className="text-2xl font-bold text-[#233446]">Admin Panel Logo</h1>
        <p className="text-[#868D9E] mt-1">
          Upload a logo to display in the admin sidebar
        </p>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          padding: "24px",
          maxWidth: "600px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#233446", marginBottom: "12px" }}>
            Upload Image
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <UploadButton onChange={(e) => handleFileChange(e, "admin")} />
            {adminPreview && (
              <span style={{ fontSize: "13px", color: "#6D41D7", fontWeight: 500 }}>
                ✓ Image selected
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#868D9E", marginTop: "12px" }}>
            PNG, JPG, or WebP. Recommended 64x64px or 128x128px for best quality. Max 2MB.
          </p>
        </div>

        {adminPreview && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#233446", marginBottom: "12px" }}>
              Preview
            </p>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "8px",
                border: "3px solid #6D41D7",
                overflow: "hidden",
                background: "#F5F5F5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <img
                src={adminPreview}
                alt="Admin Logo preview"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={() => setAdminPreview(null)}
              />
            </div>
            <button
              onClick={() => handleRemove("admin")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "transparent",
                color: "#DC2626",
                border: "1px solid #FECACA",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FEF2F2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X style={{ width: "14px", height: "14px" }} />
              Remove Logo
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "160px",
            height: "42px",
            borderRadius: "8px",
            color: "#FFFFFF",
            fontWeight: 500,
            fontSize: "14px",
            transition: "all 0.2s ease",
            background: isSaving
              ? "#A78BFA"
              : "linear-gradient(135deg, #6D41D7 0%, #8B5CF6 100%)",
            border: "none",
            cursor: isSaving ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px rgba(109, 65, 215, 0.3)",
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(109, 65, 215, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(109, 65, 215, 0.3)";
          }}
        >
          {isSaving ? (
            <>
              <div
                className="spin"
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#FFFFFF",
                }}
              />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}