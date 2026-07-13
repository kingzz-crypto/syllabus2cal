"use client";

/**
 * components/DeadlineTable.tsx — Steps 8a-9b.
 * 8a: read-only render. 8b: low-confidence highlight (in DeadlineRow) +
 * warnings banner + empty state. 9a: inline editing. 9b: delete + add row.
 * Owns `deadlines` via a controlled onChange — DeadlineTable itself holds no
 * copy of the data, only the transient "which cell is being edited" state.
 */

import { useState } from "react";
import type { Deadline } from "@/lib/types";
import {
  applyDeadlineEdit,
  createBlankDeadline,
  getFieldValue,
  sortDeadlinesByDate,
  type EditableField,
} from "@/lib/deadlineHelpers";
import { getEditErrorMessage } from "@/lib/errorMessages";
import DeadlineRow from "./DeadlineRow";

interface DeadlineTableProps {
  deadlines: Deadline[];
  warnings: string[];
  courseName: string;
  onChange: (deadlines: Deadline[]) => void;
}

interface EditingState {
  rowId: string;
  field: EditableField;
  draft: string;
  error: string | null;
}

export default function DeadlineTable({ deadlines, warnings, courseName, onChange }: DeadlineTableProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);

  function startEdit(row: Deadline, field: EditableField) {
    setEditing({ rowId: row.id, field, draft: getFieldValue(row, field), error: null });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function commitEdit() {
    if (!editing) return;
    const row = deadlines.find((d) => d.id === editing.rowId);
    if (!row) {
      setEditing(null);
      return;
    }

    const result = applyDeadlineEdit(row, editing.field, editing.draft);
    if (!result.valid || !result.deadline) {
      setEditing({ ...editing, error: getEditErrorMessage(editing.field) });
      return;
    }
    const updated = result.deadline;
    onChange(deadlines.map((d) => (d.id === row.id ? updated : d)));
    setEditing(null);
  }

  function handleDelete(row: Deadline) {
    const confirmed = window.confirm(`Delete "${row.title}"? This can't be undone.`);
    if (!confirmed) return;
    if (editing?.rowId === row.id) setEditing(null);
    onChange(deadlines.filter((d) => d.id !== row.id));
  }

  function handleAddRow() {
    const today = new Date().toISOString().slice(0, 10);
    const blank = createBlankDeadline(courseName, today);
    onChange([...deadlines, blank]);
    startEdit(blank, "title");
  }

  const addRowButton = (
    <button
      type="button"
      onClick={handleAddRow}
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      + Add a deadline
    </button>
  );

  if (deadlines.length === 0) {
    return (
      <div className="mt-8 w-full max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
        <p className="font-medium text-gray-700">No deadlines found in this PDF.</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
          If that doesn&apos;t look right, try a different file — or add deadlines yourself below.
        </p>
        <div className="mt-4">{addRowButton}</div>
      </div>
    );
  }

  const sorted = sortDeadlinesByDate(deadlines);

  return (
    <div className="mt-8 w-full max-w-3xl">
      {warnings.length > 0 && (
        <div
          role="status"
          className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <p className="font-medium">A few things to double-check:</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Type</th>
              <th scope="col" className="px-4 py-3 font-medium">Title</th>
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              <th scope="col" className="px-4 py-3 font-medium">Time</th>
              <th scope="col" className="px-4 py-3 font-medium">Notes</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((row) => (
              <DeadlineRow
                key={row.id}
                row={row}
                editingField={editing?.rowId === row.id ? editing.field : null}
                draft={editing?.rowId === row.id ? editing.draft : ""}
                error={editing?.rowId === row.id ? editing.error : null}
                onStartEdit={(field) => startEdit(row, field)}
                onDraftChange={(value) => setEditing((prev) => (prev ? { ...prev, draft: value, error: null } : prev))}
                onCommit={commitEdit}
                onCancel={cancelEdit}
                onDelete={() => handleDelete(row)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3">{addRowButton}</div>
    </div>
  );
}
