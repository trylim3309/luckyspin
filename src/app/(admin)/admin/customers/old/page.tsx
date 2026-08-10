"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spreadsheet, Column } from "@/components/admin/Spreadsheet";
import { Plus, Users, TrendingUp, Upload, Calendar, CheckCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type CallStatus = "NOT_CONTACTED" | "CALLED" | "CHATTED" | "NO_ANSWER" | "NOT_INTERESTED";
type Action = "" | "CHATTED_SUCCESS" | "CHATTED_FAILED" | "SPAM" | "BLOCKED";
type OldResult = "REGULAR_PLAYER" | "RETURNED_PLAYER" | "NOT_PLAYED_YET";
type CustomerType = "SMALL" | "BIG" | "NEVER_PLAYED";
type Priority = "FREQUENT" | "OCCASIONAL" | "LAPSED";
type Team = "KING88" | "SKY24" | "B88";
type DateFilter = "today" | "thisWeek" | "thisMonth" | "lastMonth" | "all" | "custom";

interface OldCustomer {
  id: string;
  accountId: string;
  name: string;
  phone: string | null;
  callStatus: CallStatus;
  telegramId: string | null;
  telegramName?: string | null;
  action: Action;
  lastPlayDate: string | null;
  result: OldResult;
  followUpDate: string | null;
  type: CustomerType;
  priority: Priority;
  remarks: string | null;
  team: Team;
  createdAt: string;
}

interface TelegramContact {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  team: Team;
}

const CALL_LABELS: Record<CallStatus, string> = {
  NOT_CONTACTED: "Not Contacted",
  CALLED: "Called",
  CHATTED: "Chatted",
  NO_ANSWER: "No Answer",
  NOT_INTERESTED: "Not Interested",
};

const CALL_COLORS: Record<CallStatus, string> = {
  NOT_CONTACTED: "#6B7280",
  CALLED: "#3B82F6",
  CHATTED: "#10B981",
  NO_ANSWER: "#F59E0B",
  NOT_INTERESTED: "#EF4444",
};

const ACTION_LABELS: Record<string, string> = {
  __none__: "—",
  CHATTED_SUCCESS: "ឆាតរួច",
  CHATTED_FAILED: "អត់ឆាត",
  SPAM: "ស្ពាម",
  BLOCKED: "ប្លុក",
};

const ACTION_COLORS: Record<string, string> = {
  __none__: "#6B7280",
  CHATTED_SUCCESS: "#10B981",
  CHATTED_FAILED: "#EF4444",
  SPAM: "#F59E0B",
  BLOCKED: "#6B7280",
};

const RESULT_LABELS: Record<OldResult, string> = {
  REGULAR_PLAYER: "លេងធម្មតា",
  RETURNED_PLAYER: "លេងវិញ",
  NOT_PLAYED_YET: "អត់ទាន់លេង",
};

const RESULT_COLORS: Record<OldResult, string> = {
  REGULAR_PLAYER: "#3B82F6",
  RETURNED_PLAYER: "#8B5CF6",
  NOT_PLAYED_YET: "#6B7280",
};

const TYPE_LABELS: Record<CustomerType, string> = {
  SMALL: "តូច",
  BIG: "ធំ",
  NEVER_PLAYED: "អត់ធ្លាប់លេង",
};

const TYPE_COLORS: Record<CustomerType, string> = {
  SMALL: "#6B7280",
  BIG: "#F59E0B",
  NEVER_PLAYED: "#EF4444",
};

const PRIORITY_LABELS: Partial<Record<Priority, string>> = {
  FREQUENT: "លេងជាប្រចាំ",
  LAPSED: "ខានលេងយូ",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  FREQUENT: "#10B981",
  OCCASIONAL: "#3B82F6",
  LAPSED: "#EF4444",
};

const DATE_TABS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
];

export default function OldCustomersPage() {
  const { t } = useLanguage();

  // Data
  const [customers, setCustomers] = useState<OldCustomer[]>([]);
  const customersRef = useRef<OldCustomer[]>(customers);
  useEffect(() => { customersRef.current = customers; }, [customers]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [transformDate, setTransformDate] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [callStatusFilter, setCallStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [remarksFilter, setRemarksFilter] = useState<string>("all");
  const [telegramFilter, setTelegramFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  // Current agent
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string; fullName?: string | null; team: Team; teams?: Team[]; role?: string } | null>(null);

  // Stats
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [actionCounts, setActionCounts] = useState<Record<Action, number>>({} as Record<Action, number>);
  const [resultCounts, setResultCounts] = useState<Record<OldResult, number>>({} as Record<OldResult, number>);
  const [typeCounts, setTypeCounts] = useState<Record<CustomerType, number>>({} as Record<CustomerType, number>);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Agents list for filter (admins only)
  const [agents, setAgents] = useState<{ id: string; name: string; fullName?: string | null }[]>([]);

  // Telegram contacts for dropdown
  const [telegramContacts, setTelegramContacts] = useState<TelegramContact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAutoAdding, setIsAutoAdding] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTeam, setImportTeam] = useState<string>("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [showImportResult, setShowImportResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Account ID filter state
  const [accountIdFilter, setAccountIdFilter] = useState<string[]>([]);
  const [showAccountIdFilterModal, setShowAccountIdFilterModal] = useState(false);
  const [isAccountIdUploading, setIsAccountIdUploading] = useState(false);
  const accountIdFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch telegram contacts (filtered by team if selected)
  useEffect(() => {
    const url = teamFilter !== "all" ? `/api/admin/telegram/contacts?team=${teamFilter}` : "/api/admin/telegram/contacts";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTelegramContacts(data.contacts || []);
      })
      .catch(console.error);
  }, [teamFilter]);

  // Fetch current user info and set team filter based on role
  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) {
          const agentTeams = data.admin.teams || ["KING88"];
          const agentTeam = agentTeams[0] as Team;
          setCurrentAgent({ id: data.admin.id, name: data.admin.name, fullName: data.admin.fullName, team: agentTeam, teams: agentTeams, role: data.admin.role });
          const agentRole = data.admin.role;
          // ADMIN, SUPER_ADMIN, MANAGER, TEAM_LEADER can see all teams
          const canViewAllTeams = ["ADMIN", "SUPER_ADMIN", "MANAGER", "TEAM_LEADER"].includes(agentRole);
          setIsAdmin(canViewAllTeams);
          // Regular agents can only see their team's data
          if (!canViewAllTeams) {
            setTeamFilter(agentTeam);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Create empty placeholder row
  const createEmptyRow = useCallback((): OldCustomer => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accountId: "",
    name: "",
    phone: null,
    callStatus: "NOT_CONTACTED",
    telegramId: null,
    action: "",
    lastPlayDate: null,
    result: "NOT_PLAYED_YET",
    followUpDate: null,
    type: "SMALL",
    priority: "OCCASIONAL",
    remarks: null,
    team: (currentAgent?.team as Team) || "KING88",
    createdAt: new Date().toISOString(),
  }), [currentAgent]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build params for table data (with filters)
      const params = new URLSearchParams();
      params.set("dateFilter", dateFilter);
      if (telegramFilter !== "all") params.set("telegramId", telegramFilter);
      if (search) params.set("search", search);
      if (callStatusFilter !== "all") params.set("callStatus", callStatusFilter);
      if (actionFilter === "__none__" && dateFilter === "today") {
        // For "__none__" filter on today tab, return customers where followUpDate != today
        // These are the ones that show as action="" in the table
        params.set("followUpNotToday", "true");
      } else if (actionFilter === "__none__") {
        // For "__none__" on other tabs, filter by empty action
        params.set("action", "");
      } else if (actionFilter && actionFilter !== "all") {
        params.set("action", actionFilter);
      }
      if (resultFilter !== "all") params.set("result", resultFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (remarksFilter !== "all") params.set("remarks", remarksFilter);
      if (isAdmin && teamFilter !== "all") params.set("team", teamFilter);
      params.set("limit", "10000"); // High limit for accurate stats

      // Fetch filtered data for table
      console.log("[fetchData] Calling API with params:", params.toString());
      const custRes = await fetch(`/api/admin/old-customers?${params}`, { credentials: "include" }).then((r) => r.json());
      console.log("[fetchData] Got:", custRes.customers?.length, "total:", custRes.total, "loadedAt:", custRes.loadedAt);

      let realCustomers = custRes.customers || [];

      // For "today" filter: reset action and result to defaults for follow-up
      // Skip transformation only when a SPECIFIC action filter is active (not "__none__")
      // Also skip if a specific result filter is active (keep actual results for filtering)
      const isSpecificActionFilter = actionFilter && actionFilter !== "all" && actionFilter !== "__none__";
      const isSpecificResultFilter = resultFilter && resultFilter !== "all";
      // Use scheduled time (transformDate) or default 03:00
      const scheduledTime = transformDate || "03:00";
      // Use current date for followUp comparison
      // This ensures consistent transformation based on followUpDate
      const todayStr = new Date().toISOString().split("T")[0]; // Current date YYYY-MM-DD

      if (dateFilter === "today" && !isSpecificActionFilter && !isSpecificResultFilter) {
        // For "today" tab: show all as NOT_PLAYED_YET for follow-up
        realCustomers = realCustomers.map((c: OldCustomer) => {
          const followUp = c.followUpDate ? new Date(c.followUpDate).toISOString().split("T")[0] : null;
          // If followUpDate is today, keep existing action
          if (followUp === todayStr) {
            return { ...c, result: "NOT_PLAYED_YET" as OldResult };
          }
          // Otherwise reset action to empty and result to NOT_PLAYED_YET
          return { ...c, action: "" as Action, result: "NOT_PLAYED_YET" as OldResult };
        });
      }

      // Show scheduled time for "today" follow-up display
      if (dateFilter === "today") {
        setLastRefreshed(scheduledTime);
      }

      // Apply account ID filter (client-side, only for today tab)
      if (accountIdFilter.length > 0) {
        realCustomers = realCustomers.filter((c: OldCustomer) =>
          c.accountId && accountIdFilter.includes(c.accountId.toUpperCase())
        );
      }

      // Calculate action, result and type counts from the fetched customers
      // This matches what is displayed in the table
      const actionStats: Record<string, number> = {};
      const resultStats: Record<string, number> = {};
      const typeStats: Record<string, number> = {};
      realCustomers.forEach((c: OldCustomer) => {
        // Map empty action to __none__ for stats display
        const actionKey = c.action === "" ? "__none__" : c.action;
        actionStats[actionKey] = (actionStats[actionKey] || 0) + 1;
        resultStats[c.result] = (resultStats[c.result] || 0) + 1;
        typeStats[c.type] = (typeStats[c.type] || 0) + 1;
      });
      setActionCounts(actionStats as Record<Action, number>);
      setResultCounts(resultStats as Record<OldResult, number>);
      setTypeCounts(typeStats as Record<CustomerType, number>);

      setTotalCustomers(custRes.total || 0);

      // Paginate the real customers for display (client-side pagination)
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      let paginatedCustomers = realCustomers.slice(startIdx, endIdx);

      // Re-add any pending temp rows to the displayed data
      paginatedCustomers = [...tempRowsRef.current, ...paginatedCustomers];

      setCustomers(paginatedCustomers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, telegramFilter, search, callStatusFilter, actionFilter, resultFilter, typeFilter, priorityFilter, remarksFilter, teamFilter, currentAgent?.id, createEmptyRow, isAdmin, currentPage, transformDate, accountIdFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, teamFilter, search, callStatusFilter, actionFilter, resultFilter, typeFilter, priorityFilter, remarksFilter, telegramFilter]);

  // Clear accountId filter when date changes away from today
  useEffect(() => {
    if (dateFilter !== "today") {
      setAccountIdFilter([]);
    }
  }, [dateFilter]);

  // Reset page when accountId filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [accountIdFilter]);

  // Guard to prevent duplicate saves for same row
  const savingRef = useRef<Set<number>>(new Set());

  // Track temp rows that need to be created on server first
  const pendingCreates = useRef<Set<string>>(new Set());

  // Track temp rows that should survive across fetchData calls
  const tempRowsRef = useRef<OldCustomer[]>([]);

  // Update customer
  const handleUpdate = async (rowIndex: number, key: string, value: any) => {
    const customer = customersRef.current[rowIndex];
    if (!customer) return;

    if (savingRef.current.has(rowIndex)) return;
    savingRef.current.add(rowIndex);

    const isTempRow = customer.id.startsWith("temp-");

    // Optimistic update
    const optimisticCustomer = { ...customer, [key]: value };
    setCustomers((prev) => {
      const newRows = [...prev];
      newRows[rowIndex] = optimisticCustomer;
      return newRows;
    });

    // For temp rows, first edit triggers a POST to create the row on server
    const method = isTempRow && !pendingCreates.current.has(customer.id) ? "POST" : "PUT";

    if (isTempRow && !pendingCreates.current.has(customer.id)) {
      pendingCreates.current.add(customer.id);
    }

    // Build data for POST/PUT
    let postData: Record<string, any>;
    if (method === "POST") {
      // For POST, send full row data (excluding invalid empty strings for enums)
      const rowData: Record<string, any> = { ...customer };
      // Remove empty/invalid fields that will cause enum errors
      if (!rowData.action) delete rowData.action;
      // Update with the new value
      postData = { ...rowData, [key]: value };
    } else {
      postData = { id: customer.id, [key]: value };
    }

    // Handle accountId uppercasing
    if (postData.accountId) {
      postData.accountId = String(postData.accountId).toUpperCase();
    }
    if (key === "accountId" && value) {
      postData.accountId = String(value).toUpperCase();
    }
    if (key === "action") {
      postData.followUpDate = new Date().toISOString();
    }
    if (key === "result" && (value === "REGULAR_PLAYER" || value === "RETURNED_PLAYER")) {
      postData.lastPlayDate = new Date().toISOString();
    }

    try {
      const response = await fetch("/api/admin/old-customers", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`${method} failed (${response.status}):`, text);
        // Revert optimistic update
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = customer;
          return newRows;
        });
        if (isTempRow) {
          pendingCreates.current.delete(customer.id);
        }
        return;
      }

      const result = await response.json();
      if (result.customer) {
        // For temp rows, update customersRef so subsequent edits use the real id
        if (isTempRow) {
          customersRef.current[rowIndex] = result.customer;
          pendingCreates.current.delete(customer.id);
          tempRowsRef.current = tempRowsRef.current.filter(r => r.id !== customer.id);
        }
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = result.customer;

          // Recalculate stats from updated data
          const actionStats: Record<string, number> = {};
          const resultStats: Record<string, number> = {};
          const typeStats: Record<string, number> = {};
          newRows.forEach((c: OldCustomer) => {
            actionStats[c.action] = (actionStats[c.action] || 0) + 1;
            resultStats[c.result] = (resultStats[c.result] || 0) + 1;
            typeStats[c.type] = (typeStats[c.type] || 0) + 1;
          });
          setActionCounts(actionStats as Record<Action, number>);
          setResultCounts(resultStats as Record<OldResult, number>);
          setTypeCounts(typeStats as Record<CustomerType, number>);

          return newRows;
        });
      }
    } catch (err) {
      console.error(`${method} exception:`, err);
      // Revert optimistic update
      setCustomers((prev) => {
        const newRows = [...prev];
        newRows[rowIndex] = customer;
        return newRows;
      });
      if (isTempRow) {
        pendingCreates.current.delete(customer.id);
      }
    } finally {
      savingRef.current.delete(rowIndex);
    }
  };

  // Add customer
  const handleAdd = async (data: Partial<OldCustomer>) => {
    setIsAdding(true);
    try {
      // Set followUpDate to today by default so new customers appear in "today" tab
      const dataWithFollowUp = {
        ...data,
        followUpDate: data.followUpDate || new Date().toISOString(),
      };
      const res = await fetch("/api/admin/old-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dataWithFollowUp),
      });

      if (res.ok || res.status === 201) {
        const result = await res.json();
        if (result.customer) {
          // Add the new customer to the local state optimistically
          // Wrap with temp ID so it can still be edited
          const newTempRow: OldCustomer = {
            ...result.customer,
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          };
          setCustomers((prev) => [newTempRow, ...prev]);
          // Update the ref to match
          customersRef.current = [newTempRow, ...customersRef.current];
        }
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Add empty row for quick entry (creates temp row that user can fill and save)
  const handleAddEmpty = () => {
    // Generate a placeholder accountId - user should edit this
    const tempAccountId = "AA01";
    const tempRow: OldCustomer = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      accountId: tempAccountId,
      name: "",
      phone: null,
      callStatus: "NOT_CONTACTED",
      telegramId: null,
      action: "",
      lastPlayDate: null,
      result: "NOT_PLAYED_YET",
      followUpDate: null,
      type: "SMALL",
      priority: "OCCASIONAL",
      remarks: null,
      team: (currentAgent?.team || "KING88") as Team,
      createdAt: new Date().toISOString(),
    };
    tempRowsRef.current = [...tempRowsRef.current, tempRow];
    // Immediately update customersRef so edits work right away
    customersRef.current = [tempRow, ...customersRef.current];
    setCustomers((prev) => [tempRow, ...prev]);
  };

  // Auto Add from New Customers
  const handleAutoAdd = async () => {
    if (!confirm("ដាក់បញ្ចូលភ្ញៀវដែលមាន Account ID សម្រាប់ Follow up")) return;
    setIsAutoAdding(true);
    try {
      const res = await fetch("/api/admin/old-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "autoAdd" }),
      });
      const data = await res.json();
      if (res.ok) {
        const names = data.customers?.map((c: any) => `${c.name} (${c.accountId})`).join("\n") || "";
        alert(`Added ${data.added} customers:\n\n${names}\n\n(${data.total - data.added} already exist)`);
        fetchData();
      } else {
        alert(data.error || "Failed to auto add");
      }
    } catch (error) {
      console.error("Auto add error:", error);
      alert("Failed to auto add customers");
    } finally {
      setIsAutoAdding(false);
    }
  };

  // Delete customer
  const handleDelete = async (rowIndex: number) => {
    const customer = customers[rowIndex];
    if (!customer) return;

    if (!confirm(`Delete customer "${customer.name || customer.accountId}"?`)) return;

    // For temp rows, just remove locally without API call
    if (customer.id.startsWith("temp-")) {
      tempRowsRef.current = tempRowsRef.current.filter(r => r.id !== customer.id);
      setCustomers((prev) => prev.filter((_, i) => i !== rowIndex));
      return;
    }

    const res = await fetch(`/api/admin/old-customers?id=${customer.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      fetchData();
    }
  };

  // Handle Excel file upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, importDate?: string, sheetName?: string) => {
    const file = e.target.files?.[0];
    if (!file) {
      alert("No file selected");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (importTeam) {
        formData.append("team", importTeam);
      }
      if (importDate) {
        formData.append("createdAt", importDate);
      }
      if (sheetName) {
        formData.append("sheet", sheetName);
      }

      const res = await fetch("/api/admin/old-customers/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImportResult({ imported: data.imported, skipped: data.skipped });
        setShowImportResult(true);
        setShowImportModal(false);
        setImportTeam("");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to import customers");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import customers");
    } finally {
      setIsUploading(false);
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    }
  };

  // Handle Account ID filter file upload
  const handleAccountIdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAccountIdUploading(true);
    try {
      const bytes = await file.arrayBuffer();
      const { default: XLSX } = await import("xlsx");
      const fileName = file.name.toLowerCase();
      let lines: string[];

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const workbook = XLSX.read(new Uint8Array(bytes), { type: "array" });
        const sheetNames = workbook.SheetNames;
        const selectedSheet = sheetNames[0];
        const worksheet = workbook.Sheets[selectedSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        lines = jsonData.map((row) => row.join(",")).filter((line) => line.trim());
      } else {
        const content = new TextDecoder("utf-8").decode(bytes);
        lines = content.split("\n").filter((line) => line.trim());
      }

      if (lines.length < 2) {
        alert("File is empty or has no data rows");
        return;
      }

      // Parse header to find accountId column
      const headerLine = lines[0];
      const headers = headerLine.split(",").map((h: string) => h.trim().toLowerCase());
      const accountIdIdx = headers.findIndex(h => h.includes("account") || h.includes("id"));
      if (accountIdIdx === -1) {
        alert("Could not find accountId column in file");
        return;
      }

      // Extract accountIds
      const accountIds: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        const accountId = values[accountIdIdx]?.trim().toUpperCase();
        if (accountId) {
          accountIds.push(accountId);
        }
      }

      if (accountIds.length === 0) {
        alert("No account IDs found in file");
        return;
      }

      setAccountIdFilter(accountIds);
      setShowAccountIdFilterModal(false);
    } catch (error) {
      console.error("Account ID filter upload error:", error);
      alert("Failed to process file");
    } finally {
      setIsAccountIdUploading(false);
      if (accountIdFileInputRef.current) accountIdFileInputRef.current.value = "";
    }
  };

  // Spreadsheet columns
  const columns: Column<OldCustomer>[] = [
    {
      key: "accountId",
      label: "Account ID",
      width: 120,
      editable: true,
      render: (value) => <span className="uppercase font-medium">{value || "—"}</span>,
      renderEdit: (value, onChange, onSave) => (
        <input
          type="text"
          defaultValue={value as string}
          onBlur={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onChange((e.target as HTMLInputElement).value.toUpperCase());
            }
            if (e.key === "Tab") {
              e.preventDefault();
              onChange((e.target as HTMLInputElement).value.toUpperCase());
            }
          }}
          className="w-full bg-white px-2 py-1.5 border-2 border-purple-400 rounded-lg outline-none text-sm shadow-sm uppercase"
          autoFocus
        />
      ),
    },
    {
      key: "name",
      label: "Name",
      width: 150,
      editable: true,
    },
    {
      key: "phone",
      label: "Phone",
      width: 120,
      editable: true,
    },
    {
      key: "callStatus",
      label: "Call/Chat",
      width: 100,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            backgroundColor: CALL_COLORS[value as CallStatus] + "20",
            color: CALL_COLORS[value as CallStatus],
            borderColor: CALL_COLORS[value as CallStatus] + "50",
          }}
        >
          {CALL_LABELS[value as CallStatus]}
        </Badge>
      ),
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value as string}
          onChange={(e) => { onChange(e.target.value); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          <option value="CHATTED">Chatted</option>
          <option value="CALLED">Called</option>
        </select>
      ),
    },
    {
      key: "telegramId",
      label: "Telegram",
      width: 130,
      editable: true,
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;

        const contact = telegramContacts.find(c => c.id === value);
        const displayText = contact
          ? (contact.username ? `@${contact.username}` : contact.name)
          : value;

        return <span className="text-sm">{displayText}</span>;
      },
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value || ""}
          onChange={(e) => { onChange(e.target.value || null); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          <option value="">-- Select --</option>
          {telegramContacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.username ? ` (@${c.username})` : ""}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: 120,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            backgroundColor: ACTION_COLORS[value as Action] + "20",
            color: ACTION_COLORS[value as Action],
            borderColor: ACTION_COLORS[value as Action] + "50",
          }}
        >
          {ACTION_LABELS[value as Action]}
        </Badge>
      ),
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value as string}
          onChange={(e) => { onChange(e.target.value); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          {(Object.keys(ACTION_LABELS) as Action[]).map((k) => (
            <option key={k} value={k}>{ACTION_LABELS[k]}</option>
          ))}
        </select>
      ),
    },
    {
      key: "result",
      label: "Result",
      width: 130,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            backgroundColor: RESULT_COLORS[value as OldResult] + "20",
            color: RESULT_COLORS[value as OldResult],
            borderColor: RESULT_COLORS[value as OldResult] + "50",
          }}
        >
          {RESULT_LABELS[value as OldResult]}
        </Badge>
      ),
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value as string}
          onChange={(e) => { onChange(e.target.value); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          {(Object.keys(RESULT_LABELS) as OldResult[]).map((k) => (
            <option key={k} value={k}>{RESULT_LABELS[k]}</option>
          ))}
        </select>
      ),
    },
    {
      key: "followUpDate",
      label: "Follow Up",
      width: 110,
      editable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : "-"}
        </span>
      ),
      renderEdit: (value, onChange, onSave) => (
        <input
          type="date"
          defaultValue={value ? (value as string).split("T")[0] : ""}
          onChange={(e) => { onChange(e.target.value ? new Date(e.target.value).toISOString() : null); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        />
      ),
    },
    {
      key: "type",
      label: "Type",
      width: 120,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            backgroundColor: TYPE_COLORS[value as CustomerType] + "20",
            color: TYPE_COLORS[value as CustomerType],
            borderColor: TYPE_COLORS[value as CustomerType] + "50",
          }}
        >
          {TYPE_LABELS[value as CustomerType]}
        </Badge>
      ),
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value as string}
          onChange={(e) => { onChange(e.target.value); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          {(Object.keys(TYPE_LABELS) as CustomerType[]).map((k) => (
            <option key={k} value={k}>{TYPE_LABELS[k]}</option>
          ))}
        </select>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      width: 120,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            backgroundColor: PRIORITY_COLORS[value as Priority] + "20",
            color: PRIORITY_COLORS[value as Priority],
            borderColor: PRIORITY_COLORS[value as Priority] + "50",
          }}
        >
          {PRIORITY_LABELS[value as Priority]}
        </Badge>
      ),
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value as string}
          onChange={(e) => { onChange(e.target.value); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => (
            <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>
          ))}
        </select>
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      width: 160,
      editable: true,
      render: (value) => (
        <span className="text-sm text-gray-700">
          {value || "-"}
        </span>
      ),
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value || ""}
          onChange={(e) => { onChange(e.target.value || null); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          <option value="">-- None --</option>
          <option value="Block">Block</option>
          <option value="ខូច">ខូច</option>
          <option value=" អាខោនដដែល"> អាខោនដដែល</option>
        </select>
      ),
    },
    {
      key: "lastPlayDate",
      label: "Last Play",
      width: 110,
      editable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : "-"}
        </span>
      ),
      renderEdit: (value, onChange, onSave) => (
        <input
          type="date"
          defaultValue={value ? (value as string).split("T")[0] : ""}
          onChange={(e) => { onChange(e.target.value ? new Date(e.target.value).toISOString() : null); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        />
      ),
    },
    {
      key: "stoppedDay",
      label: "Stopped Day",
      width: 100,
      editable: false,
      render: (value, row: any) => {
        // Show stopped day only when result is NOT_PLAYED_YET and we have both dates
        if (row.result === "NOT_PLAYED_YET" && row.followUpDate && row.lastPlayDate) {
          const followUp = new Date(row.followUpDate);
          const lastPlay = new Date(row.lastPlayDate);
          const diffTime = followUp.getTime() - lastPlay.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const color = diffDays > 30 ? "#EF4444" : diffDays > 7 ? "#F59E0B" : "#10B981";
          return (
            <span className="text-sm font-medium" style={{ color }}>
              {diffDays} day{diffDays !== 1 ? "s" : ""}
            </span>
          );
        }
        return <span className="text-sm text-gray-400">-</span>;
      },
    },
    {
      key: "team",
      label: "Team",
      width: 100,
      editable: true,
      render: (value) => <span className="text-sm font-medium">{value}</span>,
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value as string}
          onChange={(e) => { onChange(e.target.value); }}
          onBlur={() => {}}
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          <option value="KING88">KING88</option>
          <option value="SKY24">SKY24</option>
          <option value="B88">B88</option>
        </select>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      width: 100,
      render: (value) => <span className="text-sm text-gray-500">{value ? new Date(value).toLocaleDateString() : "-"}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#233446]">Old Customers</h1>
          <p className="text-[#868D9E] mt-1">Total: {totalCustomers} customers</p>
          {lastRefreshed && (
            <p className="text-xs text-gray-400 mt-1">Today loaded: {lastRefreshed}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {isAdmin && (["ADMIN", "SUPER_ADMIN"].includes(currentAgent?.role || "")) && (
              <>
                <label className="text-xs text-gray-500">Scheduled time:</label>
                <input
                  type="time"
                  value={transformDate || "03:00"}
                  onChange={(e) => setTransformDate(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                {transformDate && (
                  <button
                    onClick={() => setTransformDate("")}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    Reset to 03:00
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {/* Team Filter & Import - Admin only, right side */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v || "all")}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Teams">
                  {teamFilter && teamFilter !== "all" ? teamFilter : "All Teams"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {currentAgent?.teams?.map((team) => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                )) || (
                  <>
                    <SelectItem value="KING88">KING88</SelectItem>
                    <SelectItem value="SKY24">SKY24</SelectItem>
                    <SelectItem value="B88">B88</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              className="hidden"
            />
            <Button
              onClick={() => setShowImportModal(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Old
            </Button>
            <Button
              onClick={handleAutoAdd}
              disabled={isAutoAdding}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAutoAdding ? "Adding..." : "Auto Add"}
            </Button>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Import Old Customers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Created Date</label>
              <input
                type="date"
                id="importDate"
                className="w-full border rounded-lg p-2.5 text-sm"
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-500 mt-1">All imported customers will have this created date</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Team</label>
              <Select value={importTeam} onValueChange={(v) => setImportTeam(v || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team...">
                    {importTeam || "Select team..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KING88">KING88</SelectItem>
                  <SelectItem value="SKY24">SKY24</SelectItem>
                  <SelectItem value="B88">B88</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select File</label>
              <input
                type="file"
                ref={importFileInputRef}
                accept=".csv,.xlsx,.xls"
                className="w-full border rounded-lg p-2.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sheet Name (for Excel)</label>
              <input
                type="text"
                id="importSheet"
                className="w-full border rounded-lg p-2.5 text-sm"
                placeholder="Leave empty for first sheet"
                defaultValue=""
              />
              <p className="text-xs text-gray-500 mt-1">For Excel files with multiple sheets</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                if (isUploading) {
                  setIsUploading(false);
                }
              }}
            >
              {isUploading ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                const input = importFileInputRef.current;
                const dateInput = document.getElementById("importDate") as HTMLInputElement;
                const sheetInput = document.getElementById("importSheet") as HTMLInputElement;
                if (input?.files?.[0]) {
                  handleExcelUpload({ target: input } as any, dateInput?.value, sheetInput?.value);
                } else {
                  alert("Please select a file");
                }
              }}
              disabled={isUploading}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isUploading ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Result Notification */}
      {showImportResult && importResult && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { setShowImportResult(false); setImportResult(null); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl p-8 w-80 text-center border border-gray-200">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <div className="space-y-2">
              <div className="text-lg font-bold text-green-600">
                <span className="text-2xl">{importResult.imported}</span> បានដាក់បញ្ចូល
              </div>
              {importResult.skipped > 0 && (
                <div className="text-lg font-bold text-red-500">
                  {importResult.skipped} ដដែលៗ មិនដាក់បញ្ចូល
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setShowImportResult(false);
                setImportResult(null);
              }}
              className="mt-6 w-full bg-purple-500 hover:bg-purple-600"
            >
              OK
            </Button>
          </div>
        </>
      )}

      {/* Account ID Filter Modal */}
      <Dialog open={showAccountIdFilterModal} onOpenChange={setShowAccountIdFilterModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Filter by Account ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload an Excel or CSV file containing account IDs to filter customers.
              The file should have a column with "account" or "id" in the header.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Select File</label>
              <input
                type="file"
                ref={accountIdFileInputRef}
                accept=".csv,.xlsx,.xls"
                className="w-full border rounded-lg p-2.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            <p className="text-xs text-gray-500">
              Currently filtering: {accountIdFilter.length} account IDs
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAccountIdFilterModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const input = accountIdFileInputRef.current;
                if (input?.files?.[0]) {
                  handleAccountIdFileUpload({ target: input } as any);
                } else {
                  alert("Please select a file");
                }
              }}
              disabled={isAccountIdUploading}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isAccountIdUploading ? "Processing..." : "Apply Filter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action, Result & Type Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Action Stats */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Action Summary</h3>
          <div className="space-y-2">
            {(Object.keys(ACTION_LABELS) as Action[]).map((key) => (
              <button
                key={key}
                onClick={() => setActionFilter(key === actionFilter ? "all" : key)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors ${
                  actionFilter === key ? "bg-purple-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ACTION_COLORS[key] }} />
                  <span className="text-sm text-gray-700">{ACTION_LABELS[key]}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: ACTION_COLORS[key] }}>
                  {actionCounts[key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Result Stats */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Result Summary</h3>
          <div className="space-y-2">
            {(Object.keys(RESULT_LABELS) as OldResult[]).map((key) => (
              <button
                key={key}
                onClick={() => setResultFilter(key === resultFilter ? "all" : key)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors ${
                  resultFilter === key ? "bg-purple-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RESULT_COLORS[key] }} />
                  <span className="text-sm text-gray-700">{RESULT_LABELS[key]}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: RESULT_COLORS[key] }}>
                  {resultCounts[key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Type Stats */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Type Summary</h3>
          <div className="space-y-2">
            {(Object.keys(TYPE_LABELS) as CustomerType[]).map((key) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key === typeFilter ? "all" : key)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors ${
                  typeFilter === key ? "bg-purple-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[key] }} />
                  <span className="text-sm text-gray-700">{TYPE_LABELS[key]}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: TYPE_COLORS[key] }}>
                  {typeCounts[key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white rounded-lg p-3 border shadow-sm flex-wrap">
        {/* Date Tabs */}
        <div className="flex gap-1">
          {DATE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDateFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                dateFilter === tab.key
                  ? "bg-purple-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.key === "custom" ? (
                <Calendar className="w-4 h-4" />
              ) : (
                tab.label
              )}
            </button>
          ))}
        </div>

        {/* Telegram Filter */}
        <Select value={telegramFilter} onValueChange={(v) => setTelegramFilter(v || "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Telegram">
              {telegramFilter && telegramFilter !== "all"
                ? telegramFilter === "__blank__"
                  ? "No Telegram"
                  : telegramContacts.find(c => c.id === telegramFilter)?.name || "Telegram"
                : "All Telegram"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Telegram</SelectItem>
            <SelectItem value="__blank__">No Telegram</SelectItem>
            {telegramContacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.username ? ` (@${c.username})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Call/Chat Filter */}
        <Select value={callStatusFilter} onValueChange={(v) => setCallStatusFilter(v || "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Call/Chat">
              {callStatusFilter && callStatusFilter !== "all" ? CALL_LABELS[callStatusFilter as CallStatus] : "Call/Chat"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Call/Chat</SelectItem>
            <SelectItem value="CHATTED">Chatted</SelectItem>
            <SelectItem value="CALLED">Called</SelectItem>
          </SelectContent>
        </Select>

        {/* Action Filter */}
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v || "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Action">
              {actionFilter && actionFilter !== "all" ? ACTION_LABELS[actionFilter as Action] : "Action"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Action</SelectItem>
            {(Object.keys(ACTION_LABELS) as Action[]).map((k) => (
              <SelectItem key={k} value={k}>{ACTION_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Result Filter */}
        <Select value={resultFilter} onValueChange={(v) => setResultFilter(v || "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Result">
              {resultFilter && resultFilter !== "all" ? RESULT_LABELS[resultFilter as OldResult] : "Result"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Result</SelectItem>
            {(Object.keys(RESULT_LABELS) as OldResult[]).map((k) => (
              <SelectItem key={k} value={k}>{RESULT_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type">
              {typeFilter && typeFilter !== "all" ? TYPE_LABELS[typeFilter as CustomerType] : "Type"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Type</SelectItem>
            {(Object.keys(TYPE_LABELS) as CustomerType[]).map((k) => (
              <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v || "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Priority">
              {priorityFilter && priorityFilter !== "all" ? PRIORITY_LABELS[priorityFilter as Priority] : "Priority"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => (
              <SelectItem key={k} value={k}>{PRIORITY_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Remarks Filter */}
        <Select value={remarksFilter} onValueChange={(v) => setRemarksFilter(v || "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Remarks">
              {remarksFilter && remarksFilter !== "all" ? remarksFilter : "Remarks"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Remarks</SelectItem>
            <SelectItem value="__blank__">Blank</SelectItem>
            <SelectItem value="Block">Block</SelectItem>
            <SelectItem value="ខូច">ខូច</SelectItem>
            <SelectItem value=" អាខោនដដែល"> អាខោនដដែល</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-48"
        />

        {/* By AccountID Filter */}
        <Button
          variant={accountIdFilter.length > 0 ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAccountIdFilterModal(true)}
          className={accountIdFilter.length > 0 ? "bg-purple-500 hover:bg-purple-600" : ""}
        >
          By AccountID {accountIdFilter.length > 0 && `(${accountIdFilter.length})`}
        </Button>
        {accountIdFilter.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAccountIdFilter([])}
            className="text-red-500 hover:text-red-600"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Spreadsheet */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <Spreadsheet
          data={customers}
          columns={columns}
          onUpdate={handleUpdate}
          onAdd={handleAdd}
          onAddEmpty={handleAddEmpty}
          onDelete={handleDelete}
          isLoading={isLoading}
          emptyMessage="No customers found!"
        />
      </div>

      {/* Pagination */}
      {totalCustomers > pageSize && (
        <div className="flex items-center justify-between bg-white rounded-lg border shadow-sm p-3">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers} customers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {Math.ceil(totalCustomers / pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(Math.ceil(totalCustomers / pageSize))}
              disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
