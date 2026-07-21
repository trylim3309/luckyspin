"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spreadsheet, Column } from "@/components/admin/Spreadsheet";
import { Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Team = "KING88" | "SKY24" | "B88";

interface TelegramContact {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  team: Team;
  createdAt: string;
  updatedAt: string;
}

const TEAM_COLORS: Record<Team, string> = {
  KING88: "#9333EA",
  SKY24: "#3B82F6",
  B88: "#F97316",
};

const TEAM_TABS: { key: Team | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "KING88", label: "KING88" },
  { key: "SKY24", label: "SKY24" },
  { key: "B88", label: "B88" },
];

export default function TelegramContactsPage() {
  const [contacts, setContacts] = useState<TelegramContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [teamFilter, setTeamFilter] = useState<Team | "all">("all");

  // Create empty placeholder row - uses current team filter as default
  const createEmptyRow = useCallback((): TelegramContact => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: "",
    username: null,
    phone: null,
    team: teamFilter === "all" ? "KING88" : teamFilter,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [teamFilter]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (teamFilter !== "all") params.set("team", teamFilter);

      const res = await fetch(`/api/admin/telegram/contacts?${params}`, { credentials: "include" });
      const data = await res.json();

      let realContacts = data.contacts || [];
      setContacts(realContacts);

      // Add 5 empty placeholder rows for quick entry
      const emptyRows: TelegramContact[] = [];
      for (let i = 0; i < 5; i++) {
        emptyRows.push(createEmptyRow());
      }
      setContacts([...realContacts, ...emptyRows]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [teamFilter, createEmptyRow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update contact
  const handleUpdate = async (rowIndex: number, key: string, value: any) => {
    const contact = contacts[rowIndex];
    if (!contact) return;

    // If it's a temp row (not saved yet), save it first
    if (contact.id.startsWith("temp-")) {
      const res = await fetch("/api/admin/telegram/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: contact.name, team: contact.team, [key]: value }),
      });

      if (res.ok || res.status === 201) {
        const result = await res.json();
        setContacts((prev) =>
          prev.map((c, i) => (i === rowIndex ? { ...c, ...result.contact } : c))
        );
      }
      return;
    }

    // Normal update for existing contacts
    const res = await fetch("/api/admin/telegram/contacts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: contact.id, [key]: value }),
    });

    if (res.ok) {
      const data = await res.json();
      setContacts((prev) =>
        prev.map((c, i) => (i === rowIndex ? { ...c, ...data.contact } : c))
      );
    }
  };

  // Add contact
  const handleAdd = async (data: Partial<TelegramContact>) => {
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/telegram/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok || res.status === 201) {
        const result = await res.json();
        setContacts((prev) => {
          const tempIndex = prev.findIndex(c => c.id.startsWith("temp-"));
          if (tempIndex !== -1) {
            const newRows = [...prev];
            newRows[tempIndex] = result.contact;
            return newRows;
          }
          return [result.contact, ...prev];
        });
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Delete contact
  const handleDelete = async (rowIndex: number) => {
    const contact = contacts[rowIndex];
    if (!contact) return;

    // If it's a temp row, just remove from UI
    if (contact.id.startsWith("temp-")) {
      setContacts((prev) => {
        const filtered = prev.filter((_, i) => i !== rowIndex);
        return [...filtered, createEmptyRow()];
      });
      return;
    }

    if (!confirm(`Delete contact "${contact.name}"?`)) return;

    const res = await fetch(`/api/admin/telegram/contacts?id=${contact.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setContacts((prev) => {
        const filtered = prev.filter((_, i) => i !== rowIndex);
        return [...filtered, createEmptyRow()];
      });
    }
  };

  // Add new empty row
  const handleAddEmpty = async () => {
    await handleAdd({
      name: "",
      username: null,
      phone: null,
      team: teamFilter === "all" ? "KING88" : teamFilter,
    });
  };

  // Spreadsheet columns
  const columns: Column<TelegramContact>[] = [
    {
      key: "name",
      label: "Name",
      width: 150,
      editable: true,
    },
    {
      key: "username",
      label: "Username",
      width: 120,
      editable: true,
    },
    {
      key: "phone",
      label: "Phone",
      width: 120,
      editable: true,
    },
    {
      key: "team",
      label: "Team",
      width: 100,
      editable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className="text-xs font-bold"
          style={{
            backgroundColor: TEAM_COLORS[value as Team],
            color: "#fff",
          }}
        >
          {value}
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
          {(["KING88", "SKY24", "B88"] as Team[]).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
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

  const realCount = contacts.filter(c => !c.id.startsWith("temp-")).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#233446]">Telegram Contacts</h1>
          <p className="text-[#868D9E] mt-1">Manage your Telegram contacts by team</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white rounded-lg p-3 border shadow-sm">
        {/* Team Tabs */}
        <div className="flex gap-1">
          {TEAM_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTeamFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                teamFilter === tab.key
                  ? "bg-purple-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <span className="text-sm text-gray-500">
          {realCount} contact{realCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Spreadsheet */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <Spreadsheet
          data={contacts}
          columns={columns}
          onUpdate={handleUpdate}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onAddEmpty={handleAddEmpty}
          isLoading={isLoading}
          emptyMessage="No contacts found. Click 'Add Row' to add a new contact!"
        />
      </div>
    </div>
  );
}
