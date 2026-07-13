"use client";

/**
 * components/DeadlineRow.tsx — Steps 8a-9b.
 * One row of DeadlineTable. Presentational + interaction only; all the
 * validation/formatting logic it calls into lives in lib/deadlineHelpers.ts.
 * Editing state is owned by the parent (only one cell in the whole table can
 * be active at a time) and passed down.
 */

import { DEADLINE_TYPES, type Deadline, type DeadlineType } from "@/lib/types";
import { formatDateDisplay, formatTimeDisplay, type EditableField } from "@/lib/deadlineHelpers";

export const TYPE_STYLES: Record<DeadlineType, { label: string; className: string }> = {
  exam: { label: "Exam", className: "bg-rose-100 text-rose-700" },
  quiz: { label: "Quiz", className: "bg-purple-100 text-purple-700" },
  assignment: { label: "Assignment", className: "bg-blue-100 text-blue-700" },
  project: { label: "Project", className: "bg-indigo-100 text-indigo-700" },
  reading: { label: "Reading", className: "bg-emerald-100 text-emerald-700" },
  other: { label: "Other", className: "bg-gray-100 text-gray-600" },
};

interface DeadlineRowProps {
  row: Deadline;
  editingField: EditableField | null;
  draft: string;
  error: string | null;
  onStartEdit: (field: EditableField) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const inputClass =
  "w-full rounded border border-blue-400 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300";
const displayClass =
  "w-full rounded px-1.5 py-1 text-left text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300";

export default function DeadlineRow({
  row,
  editingField,
  draft,
  error,
  onStartEdit,
  onDraftChange,
  onCommit,
  onCancel,
  onDelete,
}: DeadlineRowProps) {
  const isLow = row.confidence === "low";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  function editable(field: EditableField, input: React.ReactNode, display: React.ReactNode) {
    if (editingField === field) {
      return (
        <div>
          {input}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );
    }
    return (
      <button type="button" onClick={() => onStartEdit(field)} className={displayClass}>
        {display}
      </button>
    );
  }

  return (
    <tr className={isLow ? "border-l-4 border-amber-400 bg-amber-50/60" : "border-l-4 border-transparent"}>
      <td className="px-4 py-3 align-top">
        {editable(
          "type",
          <select
            autoFocus
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={handleKeyDown}
            className={inputClass}
          >
            {DEADLINE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_STYLES[t].label}
              </option>
            ))}
          </select>,
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[row.type].className}`}>
            {TYPE_STYLES[row.type].label}
          </span>
        )}
        {isLow && <span className="mt-1 block text-[11px] font-medium text-amber-700">Needs review</span>}
      </td>

      <td className="px-4 py-3 align-top">
        {editable(
          "title",
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />,
          <span className="text-gray-900">{row.title}</span>
        )}
      </td>

      <td className="px-4 py-3 align-top whitespace-nowrap">
        {editable(
          "date",
          <input
            autoFocus
            type="date"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />,
          <span className="text-gray-700">{formatDateDisplay(row.date)}</span>
        )}
      </td>

      <td className="px-4 py-3 align-top whitespace-nowrap">
        {editable(
          "time",
          <input
            autoFocus
            type="time"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />,
          row.time ? (
            <span className="text-gray-700">{formatTimeDisplay(row.time)}</span>
          ) : (
            <span className="text-gray-400">All day</span>
          )
        )}
      </td>

      <td className="px-4 py-3 align-top">
        {editable(
          "notes",
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />,
          row.notes ? <span className="text-gray-500">{row.notes}</span> : <span className="text-gray-300">—</span>
        )}
      </td>

      <td className="px-4 py-3 align-top">
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${row.title}"`}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}
