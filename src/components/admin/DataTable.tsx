"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Search...",
  onSearch,
  onEdit,
  onDelete,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E2E8F0",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      {searchable && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div style={{ position: "relative", width: "280px" }}>
            <Search
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                color: "#A0A0B2",
              }}
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                paddingLeft: "36px",
                paddingRight: "12px",
                borderRadius: "6px",
                border: "1px solid #E2E8F0",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#6D41D7"}
              onBlur={(e) => e.target.style.borderColor = "#E2E8F0"}
            />
          </div>
        </div>
      )}

      {/* Table Container - Scrollable */}
      <div style={{ maxHeight: "500px", overflowY: "auto" }}>
        <table style={{ width: "100%", tableLayout: "auto", borderCollapse: "collapse", margin: 0 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#F8F9FA" }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    borderBottom: "2px solid #E2E8F0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: "center",
                    padding: "48px 16px",
                    color: "#A0A0B2",
                    fontSize: "14px",
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #F0F0F0",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#495057",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.render
                        ? col.render(item, index)
                        : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}