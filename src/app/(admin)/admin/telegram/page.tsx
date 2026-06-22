"use client";

import { useEffect, useState } from "react";
import { Send, Users, Radio, CheckCircle, XCircle, RefreshCw, Settings, MessageSquare, Upload, Link2, Clock } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";

interface TelegramUser {
  id: string;
  username: string;
  firstName: string;
  telegramChatId: string | null;
  telegramUsername: string | null;
}

interface PendingLink {
  id: string;
  telegramChatId: string;
  telegramUsername: string | null;
  firstName: string | null;
  createdAt: string;
}

interface WebhookStatus {
  bot?: {
    id: number;
    username: string;
    is_bot: boolean;
  };
  webhook?: {
    url: string;
    pending_updates: number;
  };
}

interface BulkLinkResult {
  linked: number;
  notFound: string[];
  noPendingLink: string[];
  errors: { username: string; error: string }[];
}

export default function TelegramPage() {
  const [isSending, setIsSending] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [setupStatus, setSetupStatus] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkLinkResult | null>(null);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  const { data: usersData, mutate: mutateUsers } = useAdminData<{ users: TelegramUser[] }>(
    "/api/admin/users?telegram=true"
  );
  const { data: webhookData, mutate: mutateWebhook } = useAdminData<WebhookStatus>(
    "/api/telegram/setup"
  );

  const users = usersData?.users || [];
  const linkedUsers = users.filter((u) => u.telegramChatId);

  useEffect(() => {
    checkWebhookStatus();
    fetchPendingLinks();
  }, []);

  const fetchPendingLinks = async () => {
    setIsLoadingPending(true);
    try {
      const res = await fetch("/api/admin/telegram/pending", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPendingLinks(data.pendingLinks || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending links:", error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const checkWebhookStatus = async () => {
    try {
      const res = await fetch("/api/telegram/setup");
      if (res.ok) {
        const data = await res.json();
        mutateWebhook({ ...data }, false);
      }
    } catch (error) {
      console.error("Failed to check webhook:", error);
    }
  };

  const handleSetupWebhook = async () => {
    setIsSettingUp(true);
    setSetupStatus(null);
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSetupStatus("success");
        checkWebhookStatus();
      } else {
        setSetupStatus("error: " + (data.error || "Failed to setup webhook"));
      }
    } catch (error) {
      setSetupStatus("error: Network error");
      console.error(error);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert("Please enter a message to broadcast");
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/telegram/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: broadcastMessage,
          parseMode: "HTML",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({ sent: data.sent, failed: data.failed });
        setBroadcastMessage("");
      } else {
        alert(data.error || "Failed to send broadcast");
      }
    } catch (error) {
      console.error("Broadcast error:", error);
      alert("Failed to send broadcast");
    } finally {
      setIsSending(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportText.trim()) {
      alert("Please paste usernames to import");
      return;
    }

    setIsBulkImporting(true);
    setBulkResult(null);

    try {
      // Parse usernames - one per line
      const usernames = bulkImportText.trim().split("\n").map((u) => u.trim()).filter((u) => u);

      if (usernames.length === 0) {
        alert("No usernames found");
        setIsBulkImporting(false);
        return;
      }

      const res = await fetch("/api/admin/telegram/link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
      });

      const data = await res.json();

      if (res.ok) {
        setBulkResult(data.results);
        setBulkImportText("");
        mutateUsers();
        fetchPendingLinks();
      } else {
        alert(data.error || "Failed to link users");
      }
    } catch (error) {
      console.error("Bulk link error:", error);
      alert("Failed to link users");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const webhookUrl = webhookData?.webhook?.url;
  const pendingUpdates = webhookData?.webhook?.pending_updates || 0;
  const botUsername = webhookData?.bot?.username;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#212529]">Telegram Bot</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">
            Manage your Telegram bot and send messages to users
          </p>
        </div>
        {botUsername && (
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#E2E8F0]">
            <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className="text-[12px] text-[#6B7280]">@{botUsername}</span>
          </div>
        )}
      </div>

      {/* Webhook Status Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6D41D7] to-[#8B5CF6] flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#495057]">Webhook Status</h2>
              <p className="text-[12px] text-[#6B7280]">Telegram bot connection</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingUpdates > 0 && (
              <span className="text-[11px] bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded-full">
                {pendingUpdates} pending
              </span>
            )}
            <button
              onClick={handleSetupWebhook}
              disabled={isSettingUp}
              className="flex items-center gap-2 px-4 py-2 bg-[#6D41D7] text-white text-[13px] font-medium rounded-lg hover:bg-[#5A35B8] transition-all disabled:opacity-50"
            >
              {isSettingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  Setup Webhook
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#F8F9FA] rounded-lg">
              <p className="text-[12px] text-[#6B7280] mb-1">Webhook URL</p>
              <p className="text-[14px] font-medium text-[#495057] break-all">
                {webhookUrl || "Not configured"}
              </p>
            </div>
            <div className="p-4 bg-[#F8F9FA] rounded-lg">
              <p className="text-[12px] text-[#6B7280] mb-1">Status</p>
              <div className="flex items-center gap-2">
                {webhookUrl ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#4CAF50]" />
                    <span className="text-[14px] font-medium text-[#4CAF50]">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[#DC2626]" />
                    <span className="text-[14px] font-medium text-[#DC2626]">Not Connected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {setupStatus && (
            <div
              className={`mt-4 p-3 rounded-lg text-[13px] ${
                setupStatus === "success"
                  ? "bg-[#D1FAE5] text-[#065F46]"
                  : "bg-[#FEE2E2] text-[#991B1B]"
              }`}
            >
              {setupStatus === "success"
                ? "✓ Webhook configured successfully!"
                : setupStatus}
            </div>
          )}

          <div className="mt-4 p-4 bg-[#FEF3C7] rounded-lg border border-[#FDE68A]">
            <p className="text-[12px] text-[#92400E]">
              <strong>How it works:</strong> Users find your bot on Telegram and send /start to link
              their account. Once linked, you can send them messages from this panel.
            </p>
          </div>
        </div>
      </div>

      {/* Broadcast Message Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4CAF50] to-[#66BB6A] flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#495057]">Broadcast Message</h2>
              <p className="text-[12px] text-[#6B7280]">Send message to all Telegram users</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-1.5 rounded-full">
            <Users className="w-4 h-4 text-[#6B7280]" />
            <span className="text-[12px] text-[#6B7280]">{linkedUsers.length} linked</span>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#495057] mb-2">
              Message (HTML supported)
            </label>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Enter your message... <b>Bold</b>, <i>Italic</i>, <a href='link'>Link</a>"
              className="w-full h-32 px-4 py-3 border border-[#E2E8F0] rounded-lg text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#6D41D7] focus:border-transparent"
            />
            <p className="text-[11px] text-[#6B7280] mt-2">
              HTML tags supported: &lt;b&gt;, &lt;i&gt;, &lt;a&gt;, &lt;code&gt;, &lt;pre&gt;
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleBroadcast}
              disabled={isSending || !broadcastMessage.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] text-white text-[13px] font-medium rounded-lg hover:from-[#43A047] hover:to-[#4CAF50] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Broadcast
                </>
              )}
            </button>

            {sendResult && (
              <div className="flex items-center gap-4 text-[13px]">
                <span className="text-[#4CAF50]">✓ Sent: {sendResult.sent}</span>
                {sendResult.failed > 0 && (
                  <span className="text-[#DC2626]">✗ Failed: {sendResult.failed}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Links - Users who sent /start but not linked */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#495057]">Pending Links</h2>
              <p className="text-[12px] text-[#6B7280]">Users who sent /start - ready to link</p>
            </div>
          </div>
          <button
            onClick={fetchPendingLinks}
            disabled={isLoadingPending}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#6B7280] hover:text-[#495057] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingPending ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="p-5">
          {pendingLinks.length > 0 ? (
            <div className="space-y-3">
              {pendingLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-[#FEF3C7] rounded-lg border border-[#FDE68A]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-white font-medium">
                      {link.firstName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#495057]">
                        {link.firstName || "Unknown"}
                      </p>
                      <p className="text-[12px] text-[#6B7280]">
                        {link.telegramUsername ? `@${link.telegramUsername}` : `ID: ${link.telegramChatId}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F4F5F7] flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-[#E2E8F0]" />
              </div>
              <p className="text-[13px] text-[#6B7280]">No pending links</p>
              <p className="text-[11px] text-[#A0A0B2] mt-1">
                Users will appear here after sending /start to the bot
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Import Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#495057]">Link Users by Username</h2>
              <p className="text-[12px] text-[#6B7280]">Paste usernames to link with pending Telegram accounts</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#495057] mb-2">
              Usernames (one per line)
            </label>
            <textarea
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              placeholder={"Enter usernames:\njohn123\njane456\nbob789"}
              className="w-full h-40 px-4 py-3 border border-[#E2E8F0] rounded-lg text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#6D41D7] focus:border-transparent font-mono"
            />
            <p className="text-[11px] text-[#6B7280] mt-2">
              The bot will match these usernames with the pending Telegram accounts above
            </p>
          </div>

          {bulkResult && (
            <div className="mb-4 p-4 bg-[#F8F9FA] rounded-lg">
              <h3 className="text-[14px] font-medium text-[#495057] mb-2">Link Results:</h3>
              <div className="flex items-center gap-4 text-[13px]">
                <span className="text-[#4CAF50]">✓ Linked: {bulkResult.linked}</span>
                {bulkResult.notFound.length > 0 && (
                  <span className="text-[#DC2626]">✗ Not found: {bulkResult.notFound.length}</span>
                )}
                {bulkResult.noPendingLink.length > 0 && (
                  <span className="text-[#F59E0B]">⚠ No Telegram: {bulkResult.noPendingLink.length}</span>
                )}
              </div>
              {bulkResult.notFound.length > 0 && (
                <div className="mt-2">
                  <p className="text-[12px] text-[#6B7280]">Users not found in system:</p>
                  <code className="text-[11px] text-[#92400E]">{bulkResult.notFound.join(", ")}</code>
                </div>
              )}
              {bulkResult.noPendingLink.length > 0 && (
                <div className="mt-2">
                  <p className="text-[12px] text-[#6B7280]">Users without Telegram /start:</p>
                  <code className="text-[11px] text-[#92400E]">{bulkResult.noPendingLink.join(", ")}</code>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleBulkImport}
              disabled={isBulkImporting || !bulkImportText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-[13px] font-medium rounded-lg hover:from-[#059669] hover:to-[#047857] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isBulkImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Link Users
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Linked Users List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0088CC] to-[#00A0E0] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#495057]">Linked Users</h2>
              <p className="text-[12px] text-[#6B7280]">Users who connected their Telegram</p>
            </div>
          </div>
          <button
            onClick={() => mutateUsers()}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#6B7280] hover:text-[#495057] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        <div className="p-5">
          {linkedUsers.length > 0 ? (
            <div className="space-y-3">
              {linkedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-lg hover:bg-[#F4F5F7] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6D41D7] to-[#8B5CF6] flex items-center justify-center text-white font-medium">
                      {user.firstName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#495057]">{user.username}</p>
                      <p className="text-[12px] text-[#6B7280]">
                        {user.telegramUsername ? `@${user.telegramUsername}` : "No Telegram username"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-[#D1FAE5] text-[#065F46] px-2 py-1 rounded-full">
                      Linked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F4F5F7] flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[#E2E8F0]" />
              </div>
              <p className="text-[14px] text-[#6B7280]">No users linked yet</p>
              <p className="text-[12px] text-[#A0A0B2] mt-1">
                Users will appear here once they message the bot with /start
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
