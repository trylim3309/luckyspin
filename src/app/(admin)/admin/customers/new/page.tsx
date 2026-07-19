"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spreadsheet, Column } from "@/components/admin/Spreadsheet";
import { Plus, Users, TrendingUp, Upload } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CallStatus = "NOT_CONTACTED" | "CALLED" | "CHATTED" | "NO_ANSWER" | "NOT_INTERESTED";
type ResultStatus = "NEW" | "INTERESTED" | "FOLLOW_UP" | "SALE" | "NOT_INTERESTED" | "CLOSED";
type Team = "KING88" | "SKY24" | "B88";
type DateFilter = "today" | "yesterday" | "thisWeek" | "thisMonth" | "all";

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
  NEW: "New",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  SALE: "Sale",
  NOT_INTERESTED: "Not Interested",
  CLOSED: "Closed",
};

const CALL_COLORS: Record<CallStatus, string> = {
  NOT_CONTACTED: "#6B7280",
  CALLED: "#3B82F6",
  CHATTED: "#10B981",
  NO_ANSWER: "#F59E0B",
  NOT_INTERESTED: "#EF4444",
};

const RESULT_COLORS: Record<ResultStatus, string> = {
  NEW: "#6B7280",
  INTERESTED: "#3B82F6",
  FOLLOW_UP: "#F59E0B",
  SALE: "#10B981",
  NOT_INTERESTED: "#EF4444",
  CLOSED: "#1E40AF",
};

const DATE_TABS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "all", label: "All" },
];

export default function NewCustomersPage() {
  const { t } = useLanguage();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Current agent
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string; team: Team } | null>(null);
  const [isAgent, setIsAgent] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ today: number; week: number; month: number; all: number }>({ today: 0, week: 0, month: 0, all: 0 });

  // Telegram contacts for dropdown
  const [telegramContacts, setTelegramContacts] = useState<TelegramContact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          // Agents can only see their own customers
          const agentRole = data.admin.role;
          setIsAgent(["AGENT", "TEAM_LEADER", "MANAGER"].includes(agentRole));
        }
      })
      .catch(console.error);
  }, []);

  // Create empty placeholder row
  const createEmptyRow = useCallback((): Customer => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accountId: null,
    name: "",
    phone: null,
    callStatus: "NOT_CONTACTED",
    result: "NEW",
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
      if (teamFilter !== "all") params.set("team", teamFilter);
      if (search) params.set("search", search);
      params.set("limit", "100");

      const [custRes, statsRes] = await Promise.all([
        fetch(`/api/admin/customers?${params}`, { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/customers/stats", { credentials: "include" }).then((r) => r.json()),
      ]);

      let realCustomers = custRes.customers || [];
      setCustomers(realCustomers);

      // Add 100 empty placeholder rows for quick entry
      const emptyRows: Customer[] = [];
      for (let i = 0; i < 100; i++) {
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
  }, [dateFilter, teamFilter, search, currentAgent?.id, createEmptyRow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update customer
  const handleUpdate = async (rowIndex: number, key: string, value: any) => {
    const customer = customers[rowIndex];
    if (!customer) return;

    // If it's a temp row (not saved yet), save it first
    if (customer.id.startsWith("temp-")) {
      // Create the customer in DB first
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      });

      if (res.ok || res.status === 201) {
        const result = await res.json();
        setCustomers((prev) =>
          prev.map((c, i) => (i === rowIndex ? { ...c, ...result.customer } : c))
        );
        setStats((prev) => ({ ...prev, today: prev.today + 1, week: prev.week + 1, month: prev.month + 1, all: prev.all + 1 }));
      }
      return;
    }

    // Normal update for existing customers
    const res = await fetch("/api/admin/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: customer.id, [key]: value }),
    });

    if (res.ok) {
      const data = await res.json();
      setCustomers((prev) =>
        prev.map((c, i) => (i === rowIndex ? { ...c, ...data.customer } : c))
      );
    }
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
        // Add a new empty row at the end to maintain 100 empty rows
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
      callStatus: "NOT_CONTACTED",
      result: "NEW",
    });
  };

  // Handle Excel file upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/customers/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Imported ${data.imported} customers successfully!`);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to import customers");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to import customers");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Spreadsheet columns
  const columns: Column<Customer>[] = [
    {
      key: "accountId",
      label: "Account ID",
      width: 100,
      editable: true,
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
      renderEdit: (value, onChange) => (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {}}
          className="w-full bg-white border border-purple-500 rounded px-1 py-0 text-sm"
          autoFocus
        >
          {(Object.keys(CALL_LABELS) as CallStatus[]).map((k) => (
            <option key={k} value={k}>{CALL_LABELS[k]}</option>
          ))}
        </select>
      ),
    },
    {
      key: "result",
      label: "Result",
      width: 120,
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
      renderEdit: (value, onChange) => (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {}}
          className="w-full bg-white border border-purple-500 rounded px-1 py-0 text-sm"
          autoFocus
        >
          {(Object.keys(RESULT_LABELS) as ResultStatus[]).map((k) => (
            <option key={k} value={k}>{RESULT_LABELS[k]}</option>
          ))}
        </select>
      ),
    },
    {
      key: "telegramId",
      label: "Telegram",
      width: 150,
      editable: true,
      render: (value) => {
        const contact = telegramContacts.find(c => c.id === value);
        return (
          <span className="text-sm">
            {contact ? `${contact.name}${contact.username ? ` (@${contact.username})` : ""}` : value || "-"}
          </span>
        );
      },
      renderEdit: (value, onChange) => (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={() => {}}
          className="w-full bg-white border border-purple-500 rounded px-1 py-0 text-sm"
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
          <h1 className="text-2xl font-bold text-[#233446]">New Customers</h1>
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? "Importing..." : "Import Excel"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500">Today</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.today}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">This Week</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.week}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.month}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-500">All Time</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.all}</div>
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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === tab.key
                  ? "bg-purple-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Team Filter */}
        {!isAgent && (
          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v || "all")}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="KING88">KING88</SelectItem>
              <SelectItem value="SKY24">SKY24</SelectItem>
              <SelectItem value="B88">B88</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone..."
          className="w-48"
        />

        <div className="flex-1" />

        <span className="text-sm text-gray-500">
          {customers.length} customer{customers.length !== 1 ? "s" : ""}
        </span>
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
          isLoading={isLoading}
          emptyMessage="No customers found. Click 'Add Row' to add a new customer!"
        />
      </div>
    </div>
  );
}
