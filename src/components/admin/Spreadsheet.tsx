"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, Clipboard, Undo2, Redo2, Plus, Download } from "lucide-react";

type Column<T> = {
  key: string;
  label: string;
  width?: number;
  editable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  renderEdit?: (value: T[keyof T], onChange: (value: unknown) => void) => React.ReactNode;
};

type SpreadsheetProps<T extends { id?: string }> = {
  data: T[];
  columns: Column<T>[];
  onUpdate: (rowIndex: number, key: string, value: unknown) => Promise<void>;
  onAdd: (data: Partial<T>) => Promise<void>;
  onDelete: (rowIndex: number) => Promise<void>;
  onAddEmpty?: () => Promise<void>;
  onExport?: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
};

export function Spreadsheet<T extends { id?: string }>({
  data,
  columns,
  onUpdate,
  onAdd,
  onDelete,
  onAddEmpty,
  onExport,
  isLoading,
  emptyMessage = "No data",
}: SpreadsheetProps<T>) {
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [selection, setSelection] = useState<{ start: { rowIndex: number; colIndex: number }; end: { rowIndex: number; colIndex: number } } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStart = useRef<{ rowIndex: number; colIndex: number } | null>(null);

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [clipboard, setClipboard] = useState<{ values: string[][]; isCut: boolean } | null>(null);
  const [undoStack, setUndoStack] = useState<{ rowIndex: number; key: string; oldValue: unknown; newValue: unknown }[]>([]);
  const [redoStack, setRedoStack] = useState<{ rowIndex: number; key: string; oldValue: unknown; newValue: unknown }[]>([]);

  const tableRef = useRef<HTMLDivElement>(null);
  const editableCols = useMemo(() => columns.filter(c => c.editable), [columns]);
  const editableColKeys = useMemo(() => editableCols.map(c => c.key), [editableCols]);

  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex) return true;
    if (selection) {
      const minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
      const maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
      const minCol = Math.min(selection.start.colIndex, selection.end.colIndex);
      const maxCol = Math.max(selection.start.colIndex, selection.end.colIndex);
      return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
    }
    return false;
  };

  const handleCellClick = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if (isLoading) return;

    // If clicking on a dropdown inside a cell, let it handle normally
    if ((e.target as HTMLElement).tagName === "SELECT") return;

    if (e.shiftKey && selectedCell) {
      setSelection({ start: selectedCell, end: { rowIndex, colIndex } });
    } else {
      setSelectedCell({ rowIndex, colIndex });
      selectionStart.current = { rowIndex, colIndex };
      setSelection(null);
      setIsSelecting(true);
    }
  };

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    const col = columns[colIndex];
    if (!col?.editable) return;
    const row = data[rowIndex];
    if (!row) return;
    setSelectedCell({ rowIndex, colIndex });
    setEditingCell({ rowIndex, colIndex });
    setEditValue(String(row[col.key as keyof T] ?? ""));
  };

  const handleCellChange = (rowIndex: number, colIndex: number, newValue: unknown) => {
    // Called by dropdowns inside cells when value changes
    const col = columns[colIndex];
    if (!col?.editable) return;
    const row = data[rowIndex];
    if (!row) return;
    setEditingCell(null);
    setSelectedCell({ rowIndex, colIndex });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart.current) return;
    const target = e.target as HTMLElement;
    const cell = target.closest("[data-row]");
    if (!cell) return;
    const rowIndex = parseInt(cell.getAttribute("data-row") || "0");
    const colIndex = parseInt(cell.getAttribute("data-col") || "0");
    setSelection({ start: selectionStart.current, end: { rowIndex, colIndex } });
  }, [isSelecting]);

  const handleMouseUp = useCallback(() => setIsSelecting(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      const col = columns[selectedCell.colIndex];
      const row = data[selectedCell.rowIndex];
      if (editingCell) return;
      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        if (col?.editable && row) {
          setEditingCell(selectedCell);
          setEditValue(String(row[col.key as keyof T] ?? ""));
        }
        return;
      }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedCell(p => p ? { ...p, rowIndex: Math.max(0, p.rowIndex - 1) } : null); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedCell(p => p ? { ...p, rowIndex: Math.min(data.length - 1, p.rowIndex + 1) } : null); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); setSelectedCell(p => p ? { ...p, colIndex: Math.max(0, p.colIndex - 1) } : null); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); setSelectedCell(p => p ? { ...p, colIndex: Math.min(columns.length - 1, p.colIndex + 1) } : null); return; }
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedCell(p => p ? { ...p, colIndex: Math.max(0, p.colIndex - 1) } : null);
        } else {
          setSelectedCell(p => p ? { ...p, colIndex: Math.min(columns.length - 1, p.colIndex + 1) } : null);
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !editingCell) {
        e.preventDefault();
        if (selection) {
          const minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
          const maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
          for (let i = maxRow; i >= minRow; i--) { onDelete(i); }
          setSelection(null);
          setSelectedCell(null);
        } else if (selectedCell) {
          onDelete(selectedCell.rowIndex);
          setSelectedCell(null);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); handleCopy(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") { e.preventDefault(); handleCut(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); handlePaste(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); handleRedo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onAddEmpty?.(); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && col?.editable) {
        setEditingCell(selectedCell);
        setEditValue(e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, editingCell, data, columns, selection]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const saveEdit = async () => {
    if (!editingCell) return;
    const col = columns[editingCell.colIndex];
    const row = data[editingCell.rowIndex];
    if (!col?.editable || !row) { setEditingCell(null); return; }
    const oldValue = row[col.key as keyof T];
    const newValue = editValue;
    if (String(oldValue ?? "") !== newValue) {
      setUndoStack(p => [...p.slice(-49), { rowIndex: editingCell.rowIndex, key: col.key, oldValue, newValue }]);
      setRedoStack([]);
      await onUpdate(editingCell.rowIndex, col.key, newValue);
    }
    setEditingCell(null);
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(""); };

  const handleCopy = () => {
    if (!selection && !selectedCell) return;
    const cells: string[][] = [];
    let minRow: number, maxRow: number, minCol: number, maxCol: number;
    if (selection) {
      minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
      maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
      minCol = Math.min(selection.start.colIndex, selection.end.colIndex);
      maxCol = Math.max(selection.start.colIndex, selection.end.colIndex);
    } else if (selectedCell) {
      minRow = maxRow = selectedCell.rowIndex;
      minCol = maxCol = selectedCell.colIndex;
    } else return;
    for (let r = minRow; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const col = columns[c];
        const rowData = data[r];
        row.push(col ? String(rowData?.[col.key as keyof T] ?? "") : "");
      }
      cells.push(row);
    }
    setClipboard({ values: cells, isCut: false });
    const text = cells.map(r => r.join("\t")).join("\n");
    navigator.clipboard.writeText(text);
  };

  const handleCut = () => { handleCopy(); setClipboard(p => p ? { ...p, isCut: true } : null); };

  const handlePaste = async () => {
    if (!selectedCell) return;

    // Get the actual column key for a given column index
    const getColumnKey = (colIndex: number): string | null => {
      const col = columns[colIndex];
      return col?.editable ? col.key : null;
    };

    // Use internal clipboard if available
    if (clipboard) {
      const updates: { rowIndex: number; key: string; value: string }[] = [];
      const adds: { data: Record<string, unknown> }[] = [];

      for (let r = 0; r < clipboard.values.length; r++) {
        const rowIndex = selectedCell.rowIndex + r;
        for (let c = 0; c < clipboard.values[r].length; c++) {
          const targetColIndex = selectedCell.colIndex + c;
          const colKey = getColumnKey(targetColIndex);
          if (colKey) {
            if (rowIndex >= data.length) {
              // Will add below
            } else {
              updates.push({ rowIndex, key: colKey, value: clipboard.values[r][c] });
            }
          }
        }
      }

      // Collect new rows to add
      for (let r = 0; r < clipboard.values.length; r++) {
        const rowIndex = selectedCell.rowIndex + r;
        if (rowIndex >= data.length) {
          const newRow: Record<string, unknown> = {};
          for (let c = 0; c < clipboard.values[r].length; c++) {
            const targetColIndex = selectedCell.colIndex + c;
            const colKey = getColumnKey(targetColIndex);
            if (colKey) newRow[colKey] = clipboard.values[r][c];
          }
          adds.push({ data: newRow });
        }
      }

      // Fire all updates in parallel
      if (updates.length > 0) {
        Promise.all(updates.map(u => onUpdate(u.rowIndex, u.key, u.value)));
      }

      if (adds.length > 0) {
        Promise.all(adds.map(a => onAdd(a.data as Partial<T>)));
      }

      if (clipboard.isCut) {
        setClipboard(null);
      }
      return;
    }

    // System clipboard paste
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split("\n").map(line => line.split("\t"));

      const updates: { rowIndex: number; key: string; value: string }[] = [];
      const adds: { data: Record<string, unknown> }[] = [];

      for (let r = 0; r < rows.length; r++) {
        const rowIndex = selectedCell.rowIndex + r;
        for (let c = 0; c < rows[r].length; c++) {
          const targetColIndex = selectedCell.colIndex + c;
          const colKey = getColumnKey(targetColIndex);
          if (colKey) {
            if (rowIndex >= data.length) {
              // Will add below
            } else {
              updates.push({ rowIndex, key: colKey, value: rows[r][c] });
            }
          }
        }
      }

      // Collect new rows
      for (let r = 0; r < rows.length; r++) {
        const rowIndex = selectedCell.rowIndex + r;
        if (rowIndex >= data.length) {
          const newRow: Record<string, unknown> = {};
          for (let c = 0; c < rows[r].length; c++) {
            const targetColIndex = selectedCell.colIndex + c;
            const colKey = getColumnKey(targetColIndex);
            if (colKey) newRow[colKey] = rows[r][c];
          }
          adds.push({ data: newRow });
        }
      }

      // Fire all updates in parallel
      if (updates.length > 0) {
        Promise.all(updates.map(u => onUpdate(u.rowIndex, u.key, u.value)));
      }

      if (adds.length > 0) {
        Promise.all(adds.map(a => onAdd(a.data as Partial<T>)));
      }
    } catch (err) { console.error("Paste failed:", err); }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(p => p.slice(0, -1));
    setRedoStack(p => [...p, last]);
    await onUpdate(last.rowIndex, last.key, last.oldValue);
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack(p => p.slice(0, -1));
    setUndoStack(p => [...p, last]);
    await onUpdate(last.rowIndex, last.key, last.newValue);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsSelecting(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Button variant="outline" size="sm" onClick={handleUndo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200" />
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={!selectedCell && !selection} title="Copy (Ctrl+C)">
          <Copy className="w-4 h-4 mr-1" /> Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleCut} disabled={!selectedCell && !selection} title="Cut (Ctrl+X)">
          <Clipboard className="w-4 h-4 mr-1" /> Cut
        </Button>
        <Button variant="outline" size="sm" onClick={handlePaste} disabled={!selectedCell} title="Paste (Ctrl+V)">
          Paste
        </Button>
        <div className="w-px h-6 bg-gray-200" />
        <Button variant="outline" size="sm" onClick={() => onAddEmpty?.()} title="Add New Row (Ctrl+Enter)">
          <Plus className="w-4 h-4 mr-1" /> Add Row
        </Button>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} title="Export Data">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        )}
        <div className="flex-1" />
        <span className="text-sm text-gray-500">{data.length} row{data.length !== 1 ? "s" : ""}</span>
      </div>

      <div ref={tableRef} className="border rounded-lg overflow-auto" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-12 px-2 py-2 text-left text-xs font-medium text-gray-500 border-b">#</th>
              {columns.map((col, colIndex) => (
                <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 border-b" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              <th className="w-12 border-b"></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="text-center py-8 text-gray-500">{emptyMessage}</td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} data-row={rowIndex} className={`group ${isCellSelected(rowIndex, -1) ? "bg-purple-50" : ""} hover:bg-gray-50`}>
                  <td className="px-2 py-1 text-xs text-gray-400 border-b text-center">{rowIndex + 1}</td>
                  {columns.map((col, colIndex) => {
                    const isSelected = isCellSelected(rowIndex, colIndex);
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;
                    const value = row[col.key as keyof T];
                    return (
                      <td
                        key={col.key}
                        data-row={rowIndex}
                        data-col={colIndex}
                        className={`px-3 py-1 border-b cursor-pointer ${isSelected ? "bg-purple-100 ring-2 ring-purple-400 ring-inset" : ""} ${col.editable ? "cursor-text" : ""}`}
                        onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                        onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                      >
                        {isEditing ? (
                          col.renderEdit ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              {col.renderEdit(value as T[keyof T], (newVal: unknown) => {
                                // Immediately save dropdown changes
                                setEditingCell(null);
                                onUpdate(rowIndex, col.key, newVal);
                              })}
                            </div>
                          ) : (
                            <input
                              ref={inputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                              className="w-full bg-white px-1 py-0 border border-purple-500 rounded outline-none"
                              autoFocus
                            />
                          )
                        ) : col.render ? (
                          col.render(value as T[keyof T], row)
                        ) : (
                          <span className="text-sm">{value != null ? String(value) : ""}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 border-b text-center">
                    <button onClick={() => onDelete(rowIndex)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400 flex flex-wrap gap-4">
        <span>Arrow keys Navigate</span>
        <span>Enter Edit</span>
        <span>Delete Remove row</span>
        <span>Ctrl+C/X/V Copy/Cut/Paste</span>
        <span>Ctrl+Z/Y Undo/Redo</span>
        <span>Double-click to edit</span>
      </div>
    </div>
  );
}

export type { Column, SpreadsheetProps };
