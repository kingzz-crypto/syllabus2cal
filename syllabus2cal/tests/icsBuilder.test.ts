import { describe, it, expect } from "vitest";
import { buildIcs, buildIcsFilename } from "@/lib/icsBuilder";
import type { Deadline } from "@/lib/types";

function makeDeadline(overrides: Partial<Deadline> = {}): Deadline {
  return {
    id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a2",
    courseName: "BIO 101",
    title: "Midterm Exam 1",
    date: "2026-09-15",
    type: "exam",
    confidence: "high",
    ...overrides,
  };
}

describe("buildIcs — 10a: all-day events", () => {
  it("produces a valid VCALENDAR/VEVENT wrapper", () => {
    const result = buildIcs([makeDeadline()]);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.ics).toContain("BEGIN:VCALENDAR");
    expect(result.ics).toContain("VERSION:2.0");
    expect(result.ics).toContain("BEGIN:VEVENT");
    expect(result.ics).toContain("END:VEVENT");
    expect(result.ics).toContain("END:VCALENDAR");
  });

  it("emits DTSTART as a date-only value (no time) for an all-day deadline", () => {
    const result = buildIcs([makeDeadline({ date: "2026-09-15" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("DTSTART;VALUE=DATE:20260915");
  });

  it("derives UID from the deadline's own id", () => {
    const result = buildIcs([makeDeadline({ id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a2" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("UID:8f14e45f-ceea-467f-a0e6-b52d17c1e4a2@syllabus2cal");
  });

  it("prefixes the title with the course name", () => {
    const result = buildIcs([makeDeadline({ courseName: "BIO 101", title: "Midterm Exam 1" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("SUMMARY:BIO 101: Midterm Exam 1");
  });

  it("escapes commas and semicolons in title and notes", () => {
    const result = buildIcs([
      makeDeadline({ title: "Exam: Ch. 1-4, Rooms A;B", notes: "Bring: calculator, ID card" }),
    ]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("Ch. 1-4\\, Rooms A\\;B");
    expect(result.ics).toContain("Bring: calculator\\, ID card");
  });

  it("sets categories from the deadline type", () => {
    const result = buildIcs([makeDeadline({ type: "reading" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("CATEGORIES:Reading");
  });

  it("omits DESCRIPTION entirely when there are no notes", () => {
    const result = buildIcs([makeDeadline({ notes: undefined })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).not.toContain("DESCRIPTION");
  });

  it("produces a valid (empty) calendar for an empty array", () => {
    const result = buildIcs([]);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.ics).toContain("BEGIN:VCALENDAR");
    expect(result.ics).not.toContain("BEGIN:VEVENT");
  });

  it("falls back to a generic calendar name for an empty array", () => {
    const result = buildIcs([]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("Syllabus2Cal");
  });

  it("uses the first deadline's course name as the calendar name", () => {
    const result = buildIcs([makeDeadline({ courseName: "CS 201" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics.toUpperCase()).toContain("CS 201");
  });

  it("line-folds a long notes field per RFC 5545 (continuation lines <= 75 octets)", () => {
    const longNote =
      "This is a fairly long note field describing exactly what to bring to the exam including a calculator, two pencils, and a valid student ID card.";
    const result = buildIcs([makeDeadline({ notes: longNote })]);
    if (!result.success) throw new Error("expected success");
    const lines = result.ics.split("\r\n");
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
    // RFC 5545 continuation lines start with a space or tab.
    expect(lines.some((l) => /^[\t ]/.test(l))).toBe(true);
  });
});

describe("buildIcs — 10b: timed events", () => {
  it("emits DTSTART with a time component for a timed deadline", () => {
    const result = buildIcs([makeDeadline({ time: "14:30" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("DTSTART:20260915T143000");
  });

  it("produces a floating local time — no trailing Z, no TZID", () => {
    const result = buildIcs([makeDeadline({ time: "14:30" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).not.toMatch(/DTSTART[^\r\n]*Z\r\n/);
    expect(result.ics).not.toContain("TZID");
  });

  it("handles midnight (00:00) correctly", () => {
    const result = buildIcs([makeDeadline({ date: "2026-01-01", time: "00:00" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("DTSTART:20260101T000000");
  });

  it("handles 23:59 (end-of-day edge case)", () => {
    const result = buildIcs([makeDeadline({ date: "2026-09-22", time: "23:59" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("DTSTART:20260922T235900");
  });

  it("gives a timed event a non-zero duration", () => {
    const result = buildIcs([makeDeadline({ time: "10:00" })]);
    if (!result.success) throw new Error("expected success");
    expect(result.ics).toContain("DURATION:PT30M");
  });

  it("mixes all-day and timed deadlines correctly in one calendar", () => {
    const result = buildIcs([
      makeDeadline({ id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a1", title: "All-day item", date: "2026-09-10" }),
      makeDeadline({
        id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a2",
        title: "Timed item",
        date: "2026-09-11",
        time: "09:00",
      }),
    ]);
    if (!result.success) throw new Error("expected success");
    const eventCount = (result.ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventCount).toBe(2);
    expect(result.ics).toContain("DTSTART;VALUE=DATE:20260910");
    expect(result.ics).toContain("DTSTART:20260911T090000");
  });
});

describe("buildIcsFilename", () => {
  it("slugifies the first deadline's course name", () => {
    expect(buildIcsFilename([makeDeadline({ courseName: "BIO 101" })])).toBe("BIO_101.ics");
  });

  it("strips special characters", () => {
    expect(buildIcsFilename([makeDeadline({ courseName: "CS 201: Intro to Programming!" })])).toBe(
      "CS_201_Intro_to_Programming.ics"
    );
  });

  it("falls back to a generic name for an empty array", () => {
    expect(buildIcsFilename([])).toBe("syllabus2cal.ics");
  });
});
