"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spreadsheet, Column } from "@/components/admin/Spreadsheet";
import { Plus, Users, TrendingUp, Upload, Calendar } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CallStatus = "NOT_CONTACTED" | "CALLED" | "CHATTED" | "NO_ANSWER" | "NOT_INTERESTED";
type ResultStatus = "NOT_CREATED" | "DEPOSIT" | "NOT_DEPOSIT";
type Team = "KING88" | "SKY24" | "B88";
type DateFilter = "today" | "yesterday" | "thisWeek" | "thisMonth" | "all" | "custom";

interface Customer {
  id: string;
  accountId: string | null;
  name: string;
  phone: string | null;
  callStatus: CallStatus;
  result: ResultStatus;
  telegramId: string | null;
  telegramName?: string | null;
  remarks: string | null;
  agentId: string;
  agentName?: string;
  team: Team;
  createdAt: string;
  updatedAt: string;
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

const RESULT_LABELS: Record<ResultStatus, string> = {
  NOT_CREATED: "មិនទាន់បង្កើតអាខោន",
  DEPOSIT: "ដាក់លុយលេង",
  NOT_DEPOSIT: "មិនទាន់ដាក់លុយលេង",
};

const CALL_COLORS: Record<CallStatus, string> = {
  NOT_CONTACTED: "#6B7280",
  CALLED: "#3B82F6",
  CHATTED: "#10B981",
  NO_ANSWER: "#F59E0B",
  NOT_INTERESTED: "#EF4444",
};

const RESULT_COLORS: Record<ResultStatus, string> = {
  NOT_CREATED: "#6B7280",
  DEPOSIT: "#10B981",
  NOT_DEPOSIT: "#F59E0B",
};

const DATE_TABS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "all", label: "All" },
  { key: "custom", label: "" },
];

export default function NewCustomersPage() {
  const { t } = useLanguage();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customersRef = useRef<Customer[]>(customers);
  useEffect(() => { customersRef.current = customers; }, [customers]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [callStatusFilter, setCallStatusFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [telegramFilter, setTelegramFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  // Current agent
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string; team: Team } | null>(null);
  const [isAgent, setIsAgent] = useState(false);

  // Stats with breakdowns for each period
  const [stats, setStats] = useState<{
    today: number;
    week: number;
    month: number;
    all: number;
    todayBreakdown: { total: number; notCreated: number; notDeposit: number; deposit: number };
    weekBreakdown: { total: number; notCreated: number; notDeposit: number; deposit: number };
    monthBreakdown: { total: number; notCreated: number; notDeposit: number; deposit: number };
    allBreakdown: { total: number; notCreated: number; notDeposit: number; deposit: number };
  }>({
    today: 0, week: 0, month: 0, all: 0,
    todayBreakdown: { total: 0, notCreated: 0, notDeposit: 0, deposit: 0 },
    weekBreakdown: { total: 0, notCreated: 0, notDeposit: 0, deposit: 0 },
    monthBreakdown: { total: 0, notCreated: 0, notDeposit: 0, deposit: 0 },
    allBreakdown: { total: 0, notCreated: 0, notDeposit: 0, deposit: 0 },
  });

  // Agents list for filter (admins only)
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  // Telegram contacts for dropdown
  const [telegramContacts, setTelegramContacts] = useState<TelegramContact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importAgentId, setImportAgentId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch telegram contacts
  useEffect(() => {
    fetch("/api/admin/telegram/contacts", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTelegramContacts(data.contacts || []);
      })
      .catch(console.error);
  }, []);

  // Fetch current agent
  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) {
          const agentTeam = (data.admin.team as Team) || "KING88";
          setCurrentAgent({ id: data.admin.id, name: data.admin.name, team: agentTeam });
          const agentRole = data.admin.role;
          // Agents (AGENT role) can only see their own customers
          setIsAgent(agentRole === "AGENT");
          // Admins and Team Leaders can filter by agent
          setIsAdmin(["ADMIN", "SUPER_ADMIN", "TEAM_LEADER", "MANAGER"].includes(agentRole));
        }
      })
      .catch(console.error);
  }, []);

  // Fetch agents list for filter
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/admin-users", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.users) {
          setAgents(data.users.map((u: any) => ({ id: u.id, name: u.name })));
        }
      })
      .catch(console.error);
  }, [isAdmin]);

  // Create empty placeholder row
  const createEmptyRow = useCallback((): Customer => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accountId: null,
    name: "",
    phone: null,
    callStatus: "CHATTED",
    result: "NOT_CREATED",
    telegramId: null,
    remarks: null,
    agentId: currentAgent?.id || "",
    team: (currentAgent?.team as Team) || "KING88",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [currentAgent]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("dateFilter", dateFilter);
      if (dateFilter === "custom") {
        if (customDateFrom) params.set("dateFrom", customDateFrom);
        if (customDateTo) params.set("dateTo", customDateTo);
      }
      if (telegramFilter !== "all") params.set("telegramId", telegramFilter);
      if (search) params.set("search", search);
      if (callStatusFilter !== "all") params.set("callStatus", callStatusFilter);
      if (resultFilter !== "all") params.set("result", resultFilter);
      if (isAdmin && agentFilter !== "all") params.set("agentId", agentFilter);
      params.set("limit", "100");

      const [custRes, statsRes] = await Promise.all([
        fetch(`/api/admin/customers?${params}`, { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/customers/stats", { credentials: "include" }).then((r) => r.json()),
      ]);

      let realCustomers = custRes.customers || [];

      // Add 5 empty placeholder rows for quick entry
      const emptyRows: Customer[] = [];
      for (let i = 0; i < 5; i++) {
        emptyRows.push(createEmptyRow());
      }
      setCustomers([...realCustomers, ...emptyRows]);

      // Get my stats
      const myStats = statsRes.agents?.find((a: any) => a.id === currentAgent?.id);
      if (myStats) {
        setStats(myStats.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, customDateFrom, customDateTo, telegramFilter, search, callStatusFilter, resultFilter, agentFilter, currentAgent?.id, createEmptyRow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Guard to prevent duplicate saves for same row
  const savingRef = useRef<Set<number>>(new Set());

  // Update customer
  const handleUpdate = async (rowIndex: number, key: string, value: any) => {
    // Always use ref to get latest state - avoids stale closure issues
    const customer = customersRef.current[rowIndex];
    if (!customer) return;

    // Prevent duplicate saves for same row
    if (savingRef.current.has(rowIndex)) return;
    savingRef.current.add(rowIndex);

    // If it's a temp row (not saved yet), save it first
    if (customer.id.startsWith("temp-")) {
      // For temp rows, if name is empty and we're not setting name, just update local state
      // BUT allow accountId to be saved even without name
      if (!customer.name && key !== "name" && key !== "accountId") {
        // Update local state only (don't save to DB yet)
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = { ...newRows[rowIndex], [key]: value };
          return newRows;
        });
        return;
      }

      // If we have name or we're setting name, create in DB
      // Allow saving if we have at least name OR accountId
      let nameValue = customer.name || (key === "name" ? value : null);
      const hasValidData = nameValue || (key === "accountId" && value);
      if (!hasValidData) {
        // Update local state only for non-critical fields
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = { ...newRows[rowIndex], [key]: value };
          return newRows;
        });
        return;
      }
      if (!nameValue) {
        // Need at least a name to save, but we have accountId so use placeholder
        nameValue = "Unknown"; // Temporary name
      }

      // Get fresh customer data from current state (includes any locally updated fields)
      const currentCustomer = customersRef.current[rowIndex];
      const tempId = customer.id;

      // Optimistically update UI
      setCustomers((prev) => {
        const newRows = [...prev];
        newRows[rowIndex] = { ...currentCustomer, id: tempId, [key]: value };
        return newRows;
      });

      const customerData = {
        name: nameValue,
        phone: currentCustomer.phone || null,
        accountId: key === "accountId" ? (value ? String(value).toUpperCase() : null) : (currentCustomer.accountId ? currentCustomer.accountId.toUpperCase() : null),
        callStatus: currentCustomer.callStatus,
        result: currentCustomer.result,
        telegramId: currentCustomer.telegramId || null,
        remarks: key === "remarks" ? value : (currentCustomer.remarks || null),
        team: currentCustomer.team,
        [key]: key === "accountId" ? (value ? String(value).toUpperCase() : null) : value,
      };

      try {
        const res = await fetch("/api/admin/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(customerData),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("Failed to save:", res.status, err);
          // Revert on failure
          setCustomers(customersRef.current);
          return;
        }
        const result = await res.json();

        // Update stats optimistically
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1));
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const createdAt = new Date(result.customer.createdAt);
        const isToday = createdAt >= todayStart;
        const isThisWeek = createdAt >= weekStart;
        const isThisMonth = createdAt >= monthStart;
        const isLastMonth = createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
        const newResult = result.customer.result;

        setStats((prev) => {
          const incrementBreakdown = (b: { total: number; notCreated: number; notDeposit: number; deposit: number }) => ({
            total: b.total + 1,
            notCreated: b.notCreated + (newResult === "NOT_CREATED" ? 1 : 0),
            notDeposit: b.notDeposit + (newResult === "NOT_DEPOSIT" ? 1 : 0),
            deposit: b.deposit + (newResult === "DEPOSIT" ? 1 : 0),
          });
          return {
            today: prev.today + (isToday ? 1 : 0),
            week: prev.week + (isThisWeek ? 1 : 0),
            month: prev.month + (isThisMonth ? 1 : 0),
            all: prev.all + (isLastMonth ? 1 : 0),
            todayBreakdown: isToday ? incrementBreakdown(prev.todayBreakdown) : prev.todayBreakdown,
            weekBreakdown: isThisWeek ? incrementBreakdown(prev.weekBreakdown) : prev.weekBreakdown,
            monthBreakdown: isThisMonth ? incrementBreakdown(prev.monthBreakdown) : prev.monthBreakdown,
            allBreakdown: isLastMonth ? incrementBreakdown(prev.allBreakdown) : prev.allBreakdown,
          };
        });

        // Replace temp row with real data
        setCustomers((prev) => {
          const newRows = prev.filter((_, i) => i !== rowIndex);
          newRows.splice(rowIndex, 0, result.customer);
          // Ensure we still have 5 empty rows at the end
          const tempCount = newRows.filter(c => c.id.startsWith("temp-")).length;
          const needed = 5 - tempCount;
          for (let i = 0; i < needed; i++) {
            newRows.push(createEmptyRow());
          }
          return newRows;
        });
      } catch (error) {
        console.error("Network error saving customer:", error);
        setCustomers(customersRef.current);
      } finally {
        savingRef.current.delete(rowIndex);
      }
      return;
    }

    // Normal update for existing customers - optimistic update
    const optimisticCustomer = { ...customer, [key]: value };
    setCustomers((prev) => {
      const newRows = [...prev];
      newRows[rowIndex] = optimisticCustomer;
      return newRows;
    });

    // Fire API call in background, don't wait
    const putData: Record<string, any> = { id: customer.id };
    if (key === "accountId") {
      putData[key] = value ? String(value).toUpperCase() : value;
    } else {
      putData[key] = value;
    }
    fetch("/api/admin/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(putData),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        console.error("PUT failed:", err);
        // Revert on failure
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = customer;
          return newRows;
        });
        return;
      }

      const data = await res.json();
      const updated = data.customer;

      // Check if customer falls within each time period
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1));
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const createdAt = new Date(customer.createdAt);
      const isToday = createdAt >= todayStart;
      const isThisWeek = createdAt >= weekStart;
      const isThisMonth = createdAt >= monthStart;
      const isLastMonth = createdAt >= lastMonthStart && createdAt <= lastMonthEnd;

      // Update stats if result or accountId changed
      if (key === "result" || key === "accountId") {
        const oldCounts = !!(customer.accountId && customer.result === "DEPOSIT");
        const newCounts = !!(updated.accountId && updated.result === "DEPOSIT");
        const prevResult = customer.result || "NOT_CREATED";
        const nextResult = updated.result || "NOT_CREATED";

        const updateBreakdown = (b: { total: number; notCreated: number; notDeposit: number; deposit: number }, prevR: string, nextR: string, oldC: boolean, newC: boolean) => {
          return {
            total: b.total,
            notCreated: b.notCreated + (prevR === "NOT_CREATED" ? -1 : 0) + (nextR === "NOT_CREATED" ? 1 : 0),
            notDeposit: b.notDeposit + (prevR === "NOT_DEPOSIT" ? -1 : 0) + (nextR === "NOT_DEPOSIT" ? 1 : 0),
            deposit: b.deposit + (oldC ? -1 : 0) + (newC ? 1 : 0),
          };
        };

        if (oldCounts !== newCounts) {
          setStats((prev) => ({
            today: prev.today + (oldCounts ? -1 : 1),
            week: prev.week + (oldCounts ? -1 : 1),
            month: prev.month + (oldCounts ? -1 : 1),
            all: prev.all + (isLastMonth ? (oldCounts ? -1 : 1) : 0),
            todayBreakdown: isToday ? updateBreakdown(prev.todayBreakdown, prevResult, nextResult, oldCounts, newCounts) : prev.todayBreakdown,
            weekBreakdown: isThisWeek ? updateBreakdown(prev.weekBreakdown, prevResult, nextResult, oldCounts, newCounts) : prev.weekBreakdown,
            monthBreakdown: isThisMonth ? updateBreakdown(prev.monthBreakdown, prevResult, nextResult, oldCounts, newCounts) : prev.monthBreakdown,
            allBreakdown: isLastMonth ? updateBreakdown(prev.allBreakdown, prevResult, nextResult, oldCounts, newCounts) : prev.allBreakdown,
          }));
        } else if (key === "result" && prevResult !== nextResult) {
          // Result changed but counts stayed same (e.g., NOT_CREATED -> NOT_DEPOSIT)
          const updateBreakdownResult = (b: { total: number; notCreated: number; notDeposit: number; deposit: number }, prevR: string, nextR: string) => ({
            total: b.total,
            notCreated: b.notCreated + (prevR === "NOT_CREATED" ? -1 : 0) + (nextR === "NOT_CREATED" ? 1 : 0),
            notDeposit: b.notDeposit + (prevR === "NOT_DEPOSIT" ? -1 : 0) + (nextR === "NOT_DEPOSIT" ? 1 : 0),
            deposit: b.deposit + (prevR === "DEPOSIT" ? -1 : 0) + (nextR === "DEPOSIT" ? 1 : 0),
          });
          setStats((prev) => ({
            ...prev,
            todayBreakdown: isToday ? updateBreakdownResult(prev.todayBreakdown, prevResult, nextResult) : prev.todayBreakdown,
            weekBreakdown: isThisWeek ? updateBreakdownResult(prev.weekBreakdown, prevResult, nextResult) : prev.weekBreakdown,
            monthBreakdown: isThisMonth ? updateBreakdownResult(prev.monthBreakdown, prevResult, nextResult) : prev.monthBreakdown,
            allBreakdown: isLastMonth ? updateBreakdownResult(prev.allBreakdown, prevResult, nextResult) : prev.allBreakdown,
          }));
        }
      }
    }).catch(console.error).finally(() => {
      savingRef.current.delete(rowIndex);
    });
  };

  // Add customer
  const handleAdd = async (data: Partial<Customer>) => {
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok || res.status === 201) {
        const result = await res.json();
        setCustomers((prev) => {
          // Find and replace the first temp row, or add at beginning
          const tempIndex = prev.findIndex(c => c.id.startsWith("temp-"));
          if (tempIndex !== -1) {
            const newRows = [...prev];
            newRows[tempIndex] = result.customer;
            return newRows;
          }
          return [result.customer, ...prev];
        });
        setStats((prev) => ({ ...prev, today: prev.today + 1, week: prev.week + 1, month: prev.month + 1, all: prev.all + 1 }));
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Delete customer
  const handleDelete = async (rowIndex: number) => {
    const customer = customers[rowIndex];
    if (!customer) return;

    // If it's a temp row, just remove from UI
    if (customer.id.startsWith("temp-")) {
      setCustomers((prev) => {
        const filtered = prev.filter((_, i) => i !== rowIndex);
        // Add a new empty row at the end to maintain 50 empty rows
        return [...filtered, createEmptyRow()];
      });
      return;
    }

    if (!confirm(`Delete customer "${customer.name}"?`)) return;

    const res = await fetch(`/api/admin/customers?id=${customer.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setCustomers((prev) => {
        const filtered = prev.filter((_, i) => i !== rowIndex);
        // Add a new empty row at the end to maintain capacity
        return [...filtered, createEmptyRow()];
      });
      setStats((prev) => ({ ...prev, today: Math.max(0, prev.today - 1), all: Math.max(0, prev.all - 1) }));
    }
  };

  // Add new empty row for direct editing in spreadsheet
  const handleAddEmpty = async () => {
    if (!currentAgent) return;
    await handleAdd({
      name: "",
      phone: null,
      team: currentAgent.team,
      callStatus: "CHATTED",
      result: "NOT_CREATED",
    });
  };

  // Handle Excel file upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, importDate?: string) => {
    const file = e.target.files?.[0];
    if (!file) {
      alert("No file selected");
      return;
    }

    console.log("1. Uploading file:", file.name, "date:", importDate);

    setIsUploading(true);
    try {
      console.log("2. Creating formData");
      const formData = new FormData();
      formData.append("file", file);
      if (isAdmin && importAgentId) {
        formData.append("agentId", importAgentId);
      }
      if (importDate) {
        formData.append("createdAt", importDate);
      }

      console.log("3. Sending fetch request");
      const res = await fetch("/api/admin/customers/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      console.log("4. Got response:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("5. Import result:", data);
        let msg = `Imported ${data.imported} customers successfully!`;
        if (data.skipped > 0) msg += ` (${data.skipped} duplicates skipped)`;
        alert(msg);
        setShowImportModal(false);
        setImportAgentId("");
        fetchData();
      } else {
        const data = await res.json();
        console.error("Import error response:", data);
        alert(data.error || "Failed to import customers");
      }
    } catch (error) {
      console.error("6. Catch error:", error);
      alert("Failed to import customers");
    } finally {
      setIsUploading(false);
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    }
  };

  // Export to CSV
  const handleExport = () => {
    const realCustomers = customers.filter(c => !c.id.startsWith("temp-"));
    if (realCustomers.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Account ID", "Name", "Phone", "Call/Chat", "Result", "Telegram", "Remarks", "Team", "Created"];
    const rows = realCustomers.map(c => [
      c.accountId || "",
      c.name,
      c.phone || "",
      c.callStatus,
      c.result,
      c.telegramName || c.telegramId || "",
      c.remarks || "",
      c.team,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Spreadsheet columns
  const columns: Column<Customer>[] = [
    {
      key: "accountId",
      label: "Account ID",
      width: 100,
      editable: true,
      render: (value) => <span className="uppercase">{value || "—"}</span>,
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
      width: 120,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs font-normal"
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
          onBlur={() => {}} // Prevent double-save: onChange already saves
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
      width: 120,
      editable: true,
      render: (value) => {
        const contact = telegramContacts.find(c => c.id === value);
        return (
          <span className="text-sm">
            {contact ? `${contact.name}${contact.username ? ` (@${contact.username})` : ""}` : value || "-"}
          </span>
        );
      },
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value || ""}
          onChange={(e) => { onChange(e.target.value || null); }}
          onBlur={() => {}} // Prevent double-save: onChange already saves
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          <option value="">-- Select --</option>
          {telegramContacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.username ? ` (@${c.username})` : ""}{c.phone ? ` - ${c.phone}` : ""}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "result",
      label: "Result",
      width: 100,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs font-normal"
          style={{
            backgroundColor: RESULT_COLORS[value as ResultStatus] + "20",
            color: RESULT_COLORS[value as ResultStatus],
            borderColor: RESULT_COLORS[value as ResultStatus] + "50",
          }}
        >
          {RESULT_LABELS[value as ResultStatus]}
        </Badge>
      ),
      renderEdit: (value, onChange, onSave) => (
        <select
          value={value as string}
          onChange={(e) => { onChange(e.target.value); }}
          onBlur={() => {}} // Prevent double-save: onChange already saves
          className="w-full bg-white border-2 border-purple-400 rounded-lg px-2 py-1.5 text-sm shadow-sm outline-none"
          autoFocus
        >
          {(Object.keys(RESULT_LABELS) as ResultStatus[]).map((k) => (
            <option key={k} value={k}>{RESULT_LABELS[k]}</option>
          ))}
        </select>
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      width: 200,
      editable: true,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#233446]">របាយការណ៍ភ្ញៀវថ្មី</h1>
          <p className="text-[#868D9E] mt-1">Manage your customer leads</p>
        </div>
        <div className="flex items-center gap-3">
          {currentAgent && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">{currentAgent.name}</Badge>
              <Badge
                variant="outline"
                className="text-sm font-bold"
                style={{
                  backgroundColor: currentAgent.team === "KING88" ? "#9333EA" : currentAgent.team === "SKY24" ? "#3B82F6" : "#F97316",
                  color: "#fff",
                }}
              >
                {currentAgent.team}
              </Badge>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Upload className="w-4 h-4 mr-1" />
            Import Excel
          </Button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Import Customers</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Created Date</label>
              <input
                type="date"
                id="importDate"
                className="w-full border rounded-lg p-2"
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-500 mt-1">All imported customers will have this created date</p>
            </div>
            {isAdmin && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Assign to Agent</label>
                <Select value={importAgentId} onValueChange={(v) => setImportAgentId(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Current User ({currentAgent?.name})</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select File</label>
              <input
                type="file"
                ref={importFileInputRef}
                accept=".csv,.xlsx,.xls"
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const input = importFileInputRef.current;
                  const dateInput = document.getElementById("importDate") as HTMLInputElement;
                  if (input?.files?.[0]) {
                    handleExcelUpload({ target: input } as any, dateInput?.value);
                  } else {
                    alert("Please select a file");
                  }
                }}
                disabled={isUploading}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {isUploading ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Card - with breakdown */}
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500 font-medium">Today</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{stats.today}</div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">សរុប</span>
              <span className="font-medium">{stats.todayBreakdown.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់បង្កើតអាខោន</span>
              <span className="font-medium text-gray-600">{stats.todayBreakdown.notCreated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់ដាក់លុយលេង</span>
              <span className="font-medium text-orange-500">{stats.todayBreakdown.notDeposit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ដាក់លុយលេង</span>
              <span className="font-medium text-green-600">{stats.todayBreakdown.deposit}</span>
            </div>
          </div>
        </div>

        {/* This Week Card - with breakdown */}
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500 font-medium">This Week</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{stats.week}</div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">សរុប</span>
              <span className="font-medium">{stats.weekBreakdown.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់បង្កើតអាខោន</span>
              <span className="font-medium text-gray-600">{stats.weekBreakdown.notCreated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់ដាក់លុយលេង</span>
              <span className="font-medium text-orange-500">{stats.weekBreakdown.notDeposit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ដាក់លុយលេង</span>
              <span className="font-medium text-green-600">{stats.weekBreakdown.deposit}</span>
            </div>
          </div>
        </div>

        {/* This Month Card - with breakdown */}
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500 font-medium">This Month</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.month}</div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">សរុប</span>
              <span className="font-medium">{stats.monthBreakdown.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់បង្កើតអាខោន</span>
              <span className="font-medium text-gray-600">{stats.monthBreakdown.notCreated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់ដាក់លុយលេង</span>
              <span className="font-medium text-orange-500">{stats.monthBreakdown.notDeposit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ដាក់លុយលេង</span>
              <span className="font-medium text-green-600">{stats.monthBreakdown.deposit}</span>
            </div>
          </div>
        </div>

        {/* Last Month Card - with breakdown */}
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-500 font-medium">Last Month</span>
          </div>
          <div className="text-3xl font-bold text-gray-600">{stats.all}</div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">សរុប</span>
              <span className="font-medium">{stats.allBreakdown.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់បង្កើតអាខោន</span>
              <span className="font-medium text-gray-600">{stats.allBreakdown.notCreated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">មិនទាន់ដាក់លុយលេង</span>
              <span className="font-medium text-orange-500">{stats.allBreakdown.notDeposit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ដាក់លុយលេង</span>
              <span className="font-medium text-green-600">{stats.allBreakdown.deposit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white rounded-lg p-3 border shadow-sm">
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

        {/* Custom Date Picker */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}

        {/* Telegram Filter */}
        <Select value={telegramFilter} onValueChange={(v) => setTelegramFilter(v || "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Telegram" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Telegram</SelectItem>
            {telegramContacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.username ? ` (@${c.username})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Agent Filter - Admin only */}
        {isAdmin && (
          <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v || "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Call/Chat Filter */}
        <Select value={callStatusFilter} onValueChange={(v) => setCallStatusFilter(v || "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Call/Chat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Call/Chat</SelectItem>
            <SelectItem value="CHATTED">Chatted</SelectItem>
            <SelectItem value="CALLED">Called</SelectItem>
          </SelectContent>
        </Select>

        {/* Result Filter */}
        <Select value={resultFilter} onValueChange={(v) => setResultFilter(v || "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Result</SelectItem>
            <SelectItem value="NOT_CREATED">{RESULT_LABELS.NOT_CREATED}</SelectItem>
            <SelectItem value="DEPOSIT">{RESULT_LABELS.DEPOSIT}</SelectItem>
            <SelectItem value="NOT_DEPOSIT">{RESULT_LABELS.NOT_DEPOSIT}</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone..."
          className="w-48"
        />
      </div>

      {/* Spreadsheet */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <Spreadsheet
          data={customers}
          columns={columns}
          onUpdate={handleUpdate}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onAddEmpty={handleAddEmpty}
          onExport={handleExport}
          isLoading={isLoading}
          emptyMessage="No customers found. Click 'Add Row' to add a new customer!"
        />
      </div>
    </div>
  );
}
