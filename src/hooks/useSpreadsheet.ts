"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

export interface Selection {
  start: CellPosition;
  end: CellPosition;
}

export interface ClipboardData {
  values: string[][];
  isCut: boolean;
}

export interface UndoStack {
  type: "edit" | "delete" | "add";
  rowIndex?: number;
  colIndex?: number;
  oldValue?: string;
  newValue?: string;
  rowData?: Record<string, string>;
}

export function useSpreadsheet<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; editable?: boolean }[],
  onUpdate: (rowIndex: number, key: string, value: any) => Promise<void>,
  onAdd: (data: Partial<T>) => Promise<void>,
  onDelete: (rowIndex: number) => Promise<void>
) {
  // Selection state
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStart = useRef<CellPosition | null>(null);

  // Clipboard
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<UndoStack[]>([]);
  const [redoStack, setRedoStack] = useState<UndoStack[]>([]);

  // Navigation
  const moveSelection = useCallback((delta: { dx: number; dy: number }) => {
    if (!selectedCell) {
      setSelectedCell({ rowIndex: 0, colIndex: 0 });
      return;
    }

    const newRow = Math.max(0, Math.min(data.length - 1, selectedCell.rowIndex + delta.dy));
    const newCol = Math.max(0, Math.min(columns.length - 1, selectedCell.colIndex + delta.dx));

    setSelectedCell({ rowIndex: newRow, colIndex: newCol });
    setSelection(null);
  }, [selectedCell, data.length, columns.length]);

  // Select cell
  const selectCell = useCallback((pos: CellPosition, isShift = false) => {
    if (isShift) {
      // Range selection
      if (selectedCell && selectionStart.current) {
        setSelection({
          start: selectionStart.current,
          end: pos,
        });
      } else {
        setSelection({ start: pos, end: pos });
      }
    } else {
      // Single cell or new selection
      setSelectedCell(pos);
      selectionStart.current = pos;
      setSelection(null);
    }
  }, [selectedCell]);

  // Start selection (mouse down)
  const startSelection = useCallback((pos: CellPosition) => {
    setIsSelecting(true);
    selectionStart.current = pos;
    setSelectedCell(pos);
    setSelection(null);
  }, []);

  // Update selection (mouse move)
  const updateSelection = useCallback((pos: CellPosition) => {
    if (isSelecting && selectionStart.current) {
      setSelection({
        start: selectionStart.current,
        end: pos,
      });
    }
  }, [isSelecting]);

  // End selection (mouse up)
  const endSelection = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // Edit cell
  const editCell = useCallback((pos: CellPosition, value: string) => {
    const row = data[pos.rowIndex];
    const colKey = columns[pos.colIndex]?.key;
    if (!row || !colKey || !columns[pos.colIndex]?.editable) return;

    // Add to undo stack
    setUndoStack(prev => [...prev, {
      type: "edit",
      rowIndex: pos.rowIndex,
      colIndex: pos.colIndex,
      oldValue: String(row[colKey] ?? ""),
      newValue: value,
    }]);
    setRedoStack([]);

    onUpdate(pos.rowIndex, colKey, value);
  }, [data, columns, onUpdate]);

  // Delete selected rows
  const deleteSelectedRows = useCallback(async () => {
    if (!selection) {
      // Delete single selected row
      if (selectedCell) {
        await onDelete(selectedCell.rowIndex);
      }
    } else {
      // Delete range of rows
      const rowsToDelete = new Set<number>();
      const { start, end } = selection;
      const minRow = Math.min(start.rowIndex, end.rowIndex);
      const maxRow = Math.max(start.rowIndex, end.rowIndex);
      for (let i = minRow; i <= maxRow; i++) {
        rowsToDelete.add(i);
      }
      // Delete from bottom to top to preserve indices
      const sorted = Array.from(rowsToDelete).sort((a, b) => b - a);
      for (const idx of sorted) {
        await onDelete(idx);
      }
    }
    setSelection(null);
    setSelectedCell(null);
  }, [selection, selectedCell, onDelete]);

  // Copy selection to clipboard
  const copySelection = useCallback(() => {
    const rows = selection ?
      getSelectedRows(selection, data) :
      (selectedCell ? [data[selectedCell.rowIndex]] : []);

    if (rows.length === 0) return;

    const colKeys = columns.filter(c => c.editable).map(c => c.key);
    const values = rows.map(row => colKeys.map(key => String(row[key] ?? "")));

    setClipboard({ values, isCut: false });
  }, [selection, selectedCell, data, columns]);

  // Cut selection to clipboard
  const cutSelection = useCallback(() => {
    copySelection();
    // Mark as cut - will be deleted on paste if confirmed
    setClipboard(prev => prev ? { ...prev, isCut: true } : null);
  }, [copySelection]);

  // Paste to selection
  const pasteSelection = useCallback(async () => {
    if (!clipboard || !selectedCell) return;

    const colKeys = columns.filter(c => c.editable).map(c => c.key);
    const { values, isCut } = clipboard;

    // Paste starting from selected cell
    for (let r = 0; r < values.length; r++) {
      const rowIndex = selectedCell.rowIndex + r;
      if (rowIndex >= data.length) {
        // Need to add new row
        const newRow: Record<string, any> = {};
        for (let c = 0; c < values[r].length; c++) {
          newRow[colKeys[c]] = values[r][c];
        }
        await onAdd(newRow as Partial<T>);
      } else {
        // Update existing row
        for (let c = 0; c < values[r].length; c++) {
          const colKey = colKeys[c];
          if (colKey) {
            await onUpdate(rowIndex, colKey, values[r][c]);
          }
        }
      }
    }

    if (isCut) {
      setClipboard(null);
    }
  }, [clipboard, selectedCell, data, columns, onUpdate, onAdd]);

  // Undo
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, last]);

    if (last.type === "edit" && last.rowIndex !== undefined && last.colIndex !== undefined) {
      const colKey = columns[last.colIndex]?.key;
      if (colKey && last.oldValue !== undefined) {
        onUpdate(last.rowIndex, colKey, last.oldValue);
      }
    }
  }, [undoStack, columns, onUpdate]);

  // Redo
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, last]);

    if (last.type === "edit" && last.rowIndex !== undefined && last.colIndex !== undefined) {
      const colKey = columns[last.colIndex]?.key;
      if (colKey && last.newValue !== undefined) {
        onUpdate(last.rowIndex, colKey, last.newValue);
      }
    }
  }, [redoStack, columns, onUpdate]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    // Navigation
    if (e.key === "ArrowUp") { e.preventDefault(); moveSelection({ dx: 0, dy: -1 }); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); moveSelection({ dx: 0, dy: 1 }); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); moveSelection({ dx: -1, dy: 0 }); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); moveSelection({ dx: 1, dy: 0 }); return; }

    // Tab navigation
    if (e.key === "Tab") {
      e.preventDefault();
      if (isCtrl) {
        moveSelection({ dx: -1, dy: 0 });
      } else {
        moveSelection({ dx: 1, dy: 0 });
      }
      return;
    }

    // Enter - start editing or move down
    if (e.key === "Enter") {
      e.preventDefault();
      if (isCtrl) {
        moveSelection({ dx: 0, dy: 1 });
      } else {
        // Start editing
        if (selectedCell) {
          return "edit";
        }
      }
      return;
    }

    // Escape - cancel editing
    if (e.key === "Escape") {
      return "cancel";
    }

    // Delete - delete selected
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelectedRows();
      return;
    }

    // Copy (Ctrl+C)
    if (isCtrl && e.key === "c") {
      e.preventDefault();
      copySelection();
      return;
    }

    // Cut (Ctrl+X)
    if (isCtrl && e.key === "x") {
      e.preventDefault();
      cutSelection();
      return;
    }

    // Paste (Ctrl+V)
    if (isCtrl && e.key === "v") {
      e.preventDefault();
      pasteSelection();
      return;
    }

    // Undo (Ctrl+Z)
    if (isCtrl && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    // Redo (Ctrl+Y or Ctrl+Shift+Z)
    if (isCtrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    // Select All (Ctrl+A)
    if (isCtrl && e.key === "a") {
      e.preventDefault();
      if (data.length > 0 && columns.length > 0) {
        setSelection({
          start: { rowIndex: 0, colIndex: 0 },
          end: { rowIndex: data.length - 1, colIndex: columns.length - 1 },
        });
      }
      return;
    }

    return null;
  }, [moveSelection, deleteSelectedRows, copySelection, cutSelection, pasteSelection, undo, redo, selectedCell, data, columns]);

  return {
    // State
    selectedCell,
    selection,
    clipboard,
    undoStack,
    redoStack,
    hasClipboard: clipboard !== null,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,

    // Actions
    selectCell,
    startSelection,
    updateSelection,
    endSelection,
    editCell,
    deleteSelectedRows,
    copySelection,
    cutSelection,
    pasteSelection,
    undo,
    redo,
    handleKeyDown,
  };
}

// Helper to get rows from selection
function getSelectedRows<T>(selection: Selection, data: T[]): T[] {
  const minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
  const maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
  return data.slice(minRow, maxRow + 1);
}
