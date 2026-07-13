/**
 * lib/deadlineHelpers.ts — pure logic for DeadlineTable (Steps 8a-9b).
 *
 * Kept separate from components/DeadlineTable.tsx per PROJECT_PLAN's
 * "API routes are thin ... logic lives in /lib" rule, extended here to UI
 * components: DeadlineTable stays focused on rendering: JSX, this file
 * holds everything that's actually unit-testable.
 */

import { DeadlineSchema, type Deadline, type DeadlineType } from "./types";

export type EditableField = "title" | "date" | "time" | "type" | "notes";

export interface EditResult {
  valid: boolean;
  deadline?: Deadline;
  error?: string;
}

/** Current string value of an editable field, for seeding an edit's draft. */
export function getFieldValue(row: Deadline, field: EditableField): string {
  switch (field) {
    case "title":
      return row.title;
    case "date":
      return row.date;
    case "time":
      return row.time ?? "";
    case "type":
      return row.type;
    case "notes":
      return row.notes ?? "";
  }
}

/**
 * Applies a single-field edit and validates the WHOLE row against
 * DeadlineSchema (not just the edited field) so a row can never end up
 * internally inconsistent. Per PROJECT_PLAN 9a: a successful edit on any
 * field promotes `confidence` to "high" — the user has just confirmed it.
 * Empty "time"/"notes" become `undefined` (all-day / no notes) rather than
 * empty strings.
 */
export function applyDeadlineEdit(original: Deadline, field: EditableField, rawValue: string): EditResult {
  const candidate: Deadline = { ...original };

  switch (field) {
    case "title":
      candidate.title = rawValue;
      break;
    case "date":
      candidate.date = rawValue;
      break;
    case "time":
      if (rawValue === "") delete candidate.time;
      else candidate.time = rawValue;
      break;
    case "type":
      // Cast is safe: the <select> only offers DEADLINE_TYPES values, and
      // DeadlineSchema.safeParse below re-validates it regardless.
      candidate.type = rawValue as DeadlineType;
      break;
    case "notes":
      if (rawValue === "") delete candidate.notes;
      else candidate.notes = rawValue;
      break;
  }

  candidate.confidence = "high";

  const parsed = DeadlineSchema.safeParse(candidate);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.issues[0]?.message ?? "Invalid value." };
  }
  return { valid: true, deadline: parsed.data };
}

/** Chronological sort — safe as plain string comparison since dates/times are ISO. */
export function sortDeadlinesByDate(deadlines: Deadline[]): Deadline[] {
  return [...deadlines].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}

/**
 * A new manually-added row (Step 9b). Always schema-valid on creation
 * (never an empty title) since it immediately enters edit mode for the
 * caller to overwrite — an invalid object should never sit in state, even
 * momentarily.
 */
export function createBlankDeadline(courseName: string, todayIso: string): Deadline {
  return {
    id: crypto.randomUUID(),
    courseName,
    title: "New deadline",
    date: todayIso,
    type: "other",
    confidence: "high",
  };
}

/** "2026-09-15" -> "Sep 15, 2026". UTC-anchored so it can't shift a day in any timezone. */
export function formatDateDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "14:30" -> "2:30 PM". UTC-anchored for the same reason as formatDateDisplay. */
export function formatTimeDisplay(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}
