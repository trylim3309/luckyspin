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
type Action = "CHATTED_SUCCESS" | "CHATTED_FAILED" | "SPAM" | "BLOCKED";
type OldResult = "REGULAR_PLAYER" | "FREQUENT_PLAYER" | "RETURNED_PLAYER" | "NOT_PLAYED_YET";
type CustomerType = "SMALL" | "BIG" | "NEVER_PLAYED" | "ACCOUNT_OPEN_NO_DEPOSIT";
type Priority = "FREQUENT" | "OCCASIONAL" | "LAPSED";
type Team = "KING88" | "SKY24" | "B88";
type DateFilter = "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "all" | "custom";

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

const CALL_COLORS: Record<CallStatus, string> = {
  NOT_CONTACTED: "#6B7280",
  CALLED: "#3B82F6",
  CHATTED: "#10B981",
  NO_ANSWER: "#F59E0B",
  NOT_INTERESTED: "#EF4444",
};

const ACTION_LABELS: Record<Action, string> = {
  CHATTED_SUCCESS: "ឆាតរួច",
  CHATTED_FAILED: "អត់ឆាត",
  SPAM: "ស្ពាម",
  BLOCKED: "ប្លុក",
};

const ACTION_COLORS: Record<Action, string> = {
  CHATTED_SUCCESS: "#10B981",
  CHATTED_FAILED: "#EF4444",
  SPAM: "#F59E0B",
  BLOCKED: "#6B7280",
};

const RESULT_LABELS: Record<OldResult, string> = {
  REGULAR_PLAYER: "លេងធម្មតា",
  FREQUENT_PLAYER: "លេងជាប្រចាំ",
  RETURNED_PLAYER: "លេងវិញ",
  NOT_PLAYED_YET: "អត់ទាន់លេង",
};

const RESULT_COLORS: Record<OldResult, string> = {
  REGULAR_PLAYER: "#3B82F6",
  FREQUENT_PLAYER: "#10B981",
  RETURNED_PLAYER: "#8B5CF6",
  NOT_PLAYED_YET: "#6B7280",
};

const TYPE_LABELS: Record<CustomerType, string> = {
  SMALL: "តូច",
  BIG: "ធំ",
  NEVER_PLAYED: "អត់ធ្លាប់លេង",
  ACCOUNT_OPEN_NO_DEPOSIT: "បើកអាខោនអត់ទាន់ដាក់លុយ",
};

const TYPE_COLORS: Record<CustomerType, string> = {
  SMALL: "#6B7280",
  BIG: "#F59E0B",
  NEVER_PLAYED: "#EF4444",
  ACCOUNT_OPEN_NO_DEPOSIT: "#8B5CF6",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  FREQUENT: "លេងជាប្រចាំ",
  OCCASIONAL: "យូៗម្តង",
  LAPSED: "ខានលេងយូ",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  FREQUENT: "#10B981",
  OCCASIONAL: "#3B82F6",
  LAPSED: "#EF4444",
};

const DATE_TABS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "" },
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
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [callStatusFilter, setCallStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [remarksFilter, setRemarksFilter] = useState<string>("all");
  const [telegramFilter, setTelegramFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  // Current agent
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string; fullName?: string | null; team: Team } | null>(null);
  const [isAgent, setIsAgent] = useState(false);

  // Stats
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Agents list for filter (admins only)
  const [agents, setAgents] = useState<{ id: string; name: string; fullName?: string | null }[]>([]);

  // Telegram contacts for dropdown
  const [telegramContacts, setTelegramContacts] = useState<TelegramContact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importAgentId, setImportAgentId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch current agent
  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) {
          const agentTeams = data.admin.teams || ["KING88"];
          const agentTeam = agentTeams[0] as Team;
          setCurrentAgent({ id: data.admin.id, name: data.admin.name, fullName: data.admin.fullName, team: agentTeam });
          const agentRole = data.admin.role;
          setIsAgent(agentRole === "AGENT");
          setIsAdmin(["ADMIN", "SUPER_ADMIN", "TEAM_LEADER", "MANAGER"].includes(agentRole));
        }
      })
      .catch(console.error);
  }, []);

  // Fetch agents list for filter (filtered by team if selected)
  useEffect(() => {
    if (!isAdmin) return;
    const url = teamFilter !== "all" ? `/api/admin/admin-users?team=${teamFilter}` : "/api/admin/admin-users";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.users) {
          setAgents(data.users.map((u: any) => ({ id: u.id, name: u.name, fullName: u.fullName })));
        }
      })
      .catch(console.error);
  }, [isAdmin, teamFilter]);

  // Create empty placeholder row
  const createEmptyRow = useCallback((): OldCustomer => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accountId: "",
    name: "",
    phone: null,
    callStatus: "NOT_CONTACTED",
    telegramId: null,
    action: "CHATTED_SUCCESS",
    lastPlayDate: null,
    result: "NOT_PLAYED_YET",
    followUpDate: null,
    type: "SMALL",
    priority: "OCCASIONAL",
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
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (resultFilter !== "all") params.set("result", resultFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (remarksFilter !== "all") params.set("remarks", remarksFilter);
      if (isAdmin && agentFilter !== "all") params.set("agentId", agentFilter);
      if (isAdmin && teamFilter !== "all") params.set("team", teamFilter);
      params.set("limit", "100");

      const custRes = await fetch(`/api/admin/old-customers?${params}`, { credentials: "include" }).then((r) => r.json());

      let realCustomers = custRes.customers || [];
      setTotalCustomers(custRes.total || 0);

      // Add 5 empty placeholder rows for quick entry
      const emptyRows: OldCustomer[] = [];
      for (let i = 0; i < 5; i++) {
        emptyRows.push(createEmptyRow());
      }
      setCustomers([...realCustomers, ...emptyRows]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, customDateFrom, customDateTo, telegramFilter, search, callStatusFilter, actionFilter, resultFilter, typeFilter, priorityFilter, remarksFilter, agentFilter, teamFilter, currentAgent?.id, createEmptyRow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Guard to prevent duplicate saves for same row
  const savingRef = useRef<Set<number>>(new Set());

  // Update customer
  const handleUpdate = async (rowIndex: number, key: string, value: any) => {
    const customer = customersRef.current[rowIndex];
    if (!customer) return;

    if (savingRef.current.has(rowIndex)) return;
    savingRef.current.add(rowIndex);

    // If it's a temp row (not saved yet)
    if (customer.id.startsWith("temp-")) {
      if (!customer.accountId && key !== "accountId") {
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = { ...newRows[rowIndex], [key]: value };
          return newRows;
        });
        return;
      }

      if (!customer.accountId && key === "accountId") {
        // Need accountId to save
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = { ...newRows[rowIndex], [key]: value };
          return newRows;
        });
        return;
      }

      // Save temp row
      const currentCustomer = customersRef.current[rowIndex];
      const tempId = customer.id;

      setCustomers((prev) => {
        const newRows = [...prev];
        newRows[rowIndex] = { ...currentCustomer, [key]: value };
        return newRows;
      });

      const customerData: any = {
        accountId: currentCustomer.accountId,
        name: currentCustomer.name || "Unknown",
        phone: currentCustomer.phone || null,
        callStatus: currentCustomer.callStatus,
        telegramId: currentCustomer.telegramId || null,
        action: key === "action" ? value : currentCustomer.action,
        lastPlayDate: currentCustomer.lastPlayDate,
        result: key === "result" ? value : currentCustomer.result,
        followUpDate: key === "action" ? new Date().toISOString() : currentCustomer.followUpDate,
        type: currentCustomer.type,
        priority: currentCustomer.priority,
        remarks: key === "remarks" ? value : (currentCustomer.remarks || null),
        team: currentCustomer.team,
        [key]: value,
      };

      try {
        const res = await fetch("/api/admin/old-customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(customerData),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("Failed to save:", res.status, err);
          setCustomers(customersRef.current);
          return;
        }
        const result = await res.json();

        setCustomers((prev) => {
          const newRows = prev.filter((_, i) => i !== rowIndex);
          newRows.splice(rowIndex, 0, result.customer);
          const tempCount = newRows.filter(c => c.id.startsWith("temp-")).length;
          const needed = 5 - tempCount;
          for (let i = 0; i < needed; i++) {
            newRows.push(createEmptyRow());
          }
          return newRows;
        });
        setTotalCustomers((prev) => prev + 1);
      } catch (error) {
        console.error("Network error saving customer:", error);
        setCustomers(customersRef.current);
      } finally {
        savingRef.current.delete(rowIndex);
      }
      return;
    }

    // Normal update for existing customers
    const optimisticCustomer = { ...customer, [key]: value };
    setCustomers((prev) => {
      const newRows = [...prev];
      newRows[rowIndex] = optimisticCustomer;
      return newRows;
    });

    const putData: Record<string, any> = { id: customer.id, [key]: value };
    if (key === "accountId") {
      putData[key] = value ? String(value).toUpperCase() : value;
    }
    if (key === "action") {
      putData.followUpDate = new Date().toISOString();
    }

    fetch("/api/admin/old-customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(putData),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        console.error("PUT failed:", err);
        setCustomers((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = customer;
          return newRows;
        });
        return;
      }
    }).catch(console.error).finally(() => {
      savingRef.current.delete(rowIndex);
    });
  };

  // Add customer
  const handleAdd = async (data: Partial<OldCustomer>) => {
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/old-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok || res.status === 201) {
        const result = await res.json();
        setCustomers((prev) => {
          const tempIndex = prev.findIndex(c => c.id.startsWith("temp-"));
          if (tempIndex !== -1) {
            const newRows = [...prev];
            newRows[tempIndex] = result.customer;
            return newRows;
          }
          return [result.customer, ...prev];
        });
        setTotalCustomers((prev) => prev + 1);
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Delete customer
  const handleDelete = async (rowIndex: number) => {
    const customer = customers[rowIndex];
    if (!customer) return;

    if (customer.id.startsWith("temp-")) {
      setCustomers((prev) => {
        const filtered = prev.filter((_, i) => i !== rowIndex);
        return [...filtered, createEmptyRow()];
      });
      return;
    }

    if (!confirm(`Delete customer "${customer.name || customer.accountId}"?`)) return;

    const res = await fetch(`/api/admin/old-customers?id=${customer.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setCustomers((prev) => {
        const filtered = prev.filter((_, i) => i !== rowIndex);
        return [...filtered, createEmptyRow()];
      });
      setTotalCustomers((prev) => Math.max(0, prev - 1));
    }
  };

  // Add new empty row
  const handleAddEmpty = async () => {
    if (!currentAgent) return;
    await handleAdd({
      accountId: "",
      name: "",
      phone: null,
      team: currentAgent.team,
      callStatus: "NOT_CONTACTED",
      action: "CHATTED_SUCCESS",
      result: "NOT_PLAYED_YET",
      type: "SMALL",
      priority: "OCCASIONAL",
    });
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
      key: "stoppedDay",
      label: "Stopped Day",
      width: 100,
      editable: false,
      render: (value, row: any) => {
        if (row.result !== "NOT_PLAYED_YET" || !row.followUpDate || !row.lastPlayDate) {
          return <span className="text-sm text-gray-400">-</span>;
        }
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
      },
    },
    {
      key: "remarks",
      label: "Remarks",
      width: 200,
      editable: true,
    },
    {
      key: "agentId",
      label: "Agent",
      width: 120,
      editable: false,
      render: (value, row: any) => {
        const agent = row?.agent;
        const displayName = agent?.fullName || agent?.name || "-";
        return <span className="text-sm">{displayName}</span>;
      },
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
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#233446]">Old Customers</h1>
            <p className="text-[#868D9E] mt-1">Total: {totalCustomers} customers</p>
          </div>
          {/* Team & Agent Filters - Admin only */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v || "all")}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Teams">
                    {teamFilter && teamFilter !== "all" ? teamFilter : "All Teams"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="KING88">KING88</SelectItem>
                  <SelectItem value="SKY24">SKY24</SelectItem>
                  <SelectItem value="B88">B88</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v || "all")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Agents">
                    {agentFilter && agentFilter !== "all"
                      ? agents.find(a => a.id === agentFilter)?.fullName || agents.find(a => a.id === agentFilter)?.name
                      : "All Agents"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.fullName || a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            <SelectValue placeholder="All Telegram">
              {telegramFilter && telegramFilter !== "all"
                ? telegramContacts.find(c => c.id === telegramFilter)?.name || "Telegram"
                : "All Telegram"
              }
            </SelectValue>
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
            <SelectItem value="has_remarks">Has Remarks</SelectItem>
            <SelectItem value="no_remarks">No Remarks</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
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
          isLoading={isLoading}
          emptyMessage="No customers found!"
        />
      </div>
    </div>
  );
}
