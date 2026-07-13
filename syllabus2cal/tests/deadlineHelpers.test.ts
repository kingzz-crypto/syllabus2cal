import { describe, it, expect } from "vitest";
import {
  applyDeadlineEdit,
  createBlankDeadline,
  formatDateDisplay,
  formatTimeDisplay,
  getFieldValue,
  sortDeadlinesByDate,
} from "@/lib/deadlineHelpers";
import type { Deadline } from "@/lib/types";

const baseRow: Deadline = {
  id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a2",
  courseName: "BIO 101",
  title: "Midterm Exam 1",
  date: "2026-09-15",
  time: "10:00",
  type: "exam",
  notes: "Room 204",
  confidence: "low",
};

describe("getFieldValue", () => {
  it("reads each editable field, defaulting optional fields to ''", () => {
    expect(getFieldValue(baseRow, "title")).toBe("Midterm Exam 1");
    expect(getFieldValue(baseRow, "date")).toBe("2026-09-15");
    expect(getFieldValue(baseRow, "time")).toBe("10:00");
    expect(getFieldValue(baseRow, "type")).toBe("exam");
    expect(getFieldValue(baseRow, "notes")).toBe("Room 204");
    expect(getFieldValue({ ...baseRow, time: undefined, notes: undefined }, "time")).toBe("");
    expect(getFieldValue({ ...baseRow, time: undefined, notes: undefined }, "notes")).toBe("");
  });
});

describe("applyDeadlineEdit", () => {
  it("commits a valid title edit and promotes confidence to high", () => {
    const result = applyDeadlineEdit(baseRow, "title", "Midterm Exam 1 (Ch 1-5)");
    expect(result.valid).toBe(true);
    expect(result.deadline?.title).toBe("Midterm Exam 1 (Ch 1-5)");
    expect(result.deadline?.confidence).toBe("high");
  });

  it("rejects an empty title without mutating the original", () => {
    const result = applyDeadlineEdit(baseRow, "title", "   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
    expect(baseRow.title).toBe("Midterm Exam 1"); // untouched
  });

  it("rejects a malformed date", () => {
    const result = applyDeadlineEdit(baseRow, "date", "09/15/2026");
    expect(result.valid).toBe(false);
  });

  it("rejects an impossible calendar date", () => {
    const result = applyDeadlineEdit(baseRow, "date", "2026-02-30");
    expect(result.valid).toBe(false);
  });

  it("accepts a valid date change", () => {
    const result = applyDeadlineEdit(baseRow, "date", "2026-09-20");
    expect(result.valid).toBe(true);
    expect(result.deadline?.date).toBe("2026-09-20");
  });

  it("clearing time makes the event all-day (time becomes undefined)", () => {
    const result = applyDeadlineEdit(baseRow, "time", "");
    expect(result.valid).toBe(true);
    expect(result.deadline?.time).toBeUndefined();
  });

  it("rejects a malformed time", () => {
    const result = applyDeadlineEdit(baseRow, "time", "25:99");
    expect(result.valid).toBe(false);
  });

  it("accepts a valid type change", () => {
    const result = applyDeadlineEdit(baseRow, "type", "quiz");
    expect(result.valid).toBe(true);
    expect(result.deadline?.type).toBe("quiz");
  });

  it("rejects an invented type value", () => {
    const result = applyDeadlineEdit(baseRow, "type", "homework");
    expect(result.valid).toBe(false);
  });

  it("clearing notes removes the field entirely", () => {
    const result = applyDeadlineEdit(baseRow, "notes", "");
    expect(result.valid).toBe(true);
    expect(result.deadline?.notes).toBeUndefined();
  });

  it("promotes confidence to high even on an already-high row (idempotent)", () => {
    const result = applyDeadlineEdit({ ...baseRow, confidence: "high" }, "title", "New title");
    expect(result.valid).toBe(true);
    expect(result.deadline?.confidence).toBe("high");
  });
});

describe("sortDeadlinesByDate", () => {
  it("sorts by date ascending", () => {
    const rows: Deadline[] = [
      { ...baseRow, id: "1", date: "2026-10-01", time: undefined },
      { ...baseRow, id: "2", date: "2026-09-01", time: undefined },
      { ...baseRow, id: "3", date: "2026-09-15", time: undefined },
    ];
    expect(sortDeadlinesByDate(rows).map((r) => r.id)).toEqual(["2", "3", "1"]);
  });

  it("on the same date, sorts all-day (no time) before timed events", () => {
    const rows: Deadline[] = [
      { ...baseRow, id: "1", date: "2026-09-15", time: "09:00" },
      { ...baseRow, id: "2", date: "2026-09-15", time: undefined },
    ];
    expect(sortDeadlinesByDate(rows).map((r) => r.id)).toEqual(["2", "1"]);
  });

  it("does not mutate the input array", () => {
    const rows: Deadline[] = [
      { ...baseRow, id: "1", date: "2026-10-01" },
      { ...baseRow, id: "2", date: "2026-09-01" },
    ];
    const original = [...rows];
    sortDeadlinesByDate(rows);
    expect(rows).toEqual(original);
  });
});

describe("createBlankDeadline", () => {
  it("creates a schema-valid row with sensible defaults", () => {
    const blank = createBlankDeadline("BIO 101", "2026-07-11");
    expect(blank.title).toBe("New deadline");
    expect(blank.date).toBe("2026-07-11");
    expect(blank.type).toBe("other");
    expect(blank.confidence).toBe("high");
    expect(blank.courseName).toBe("BIO 101");
  });

  it("generates a unique id each call", () => {
    const a = createBlankDeadline("BIO 101", "2026-07-11");
    const b = createBlankDeadline("BIO 101", "2026-07-11");
    expect(a.id).not.toBe(b.id);
  });
});

describe("formatDateDisplay", () => {
  it("formats an ISO date for display", () => {
    expect(formatDateDisplay("2026-09-15")).toBe("Sep 15, 2026");
  });

  it("does not shift the date across a timezone boundary", () => {
    // Regression guard: naive `new Date("2026-01-01")` + local toLocaleDateString
    // can render as Dec 31 in negative-UTC-offset timezones.
    expect(formatDateDisplay("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDateDisplay("2026-12-31")).toBe("Dec 31, 2026");
  });
});

describe("formatTimeDisplay", () => {
  it("formats 24h time as 12h with AM/PM", () => {
    expect(formatTimeDisplay("14:30")).toBe("2:30 PM");
    expect(formatTimeDisplay("09:05")).toBe("9:05 AM");
    expect(formatTimeDisplay("00:00")).toBe("12:00 AM");
    expect(formatTimeDisplay("23:59")).toBe("11:59 PM");
  });
});
