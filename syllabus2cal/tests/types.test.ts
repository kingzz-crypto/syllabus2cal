import { describe, it, expect } from "vitest";
import {
  DeadlineSchema,
  GeminiDeadlineSchema,
  ExtractionResultSchema,
  IsoDateSchema,
  TimeSchema,
  toDeadline,
  type GeminiDeadline,
} from "@/lib/types";

/** A known-good extraction deadline to mutate per test case. */
const validExtracted: GeminiDeadline = {
  courseName: "BIO 101",
  title: "Midterm Exam 1",
  date: "2026-09-15",
  time: "23:59",
  type: "exam",
  notes: "Room 204, worth 25%",
  confidence: "high",
};

describe("IsoDateSchema", () => {
  it("accepts a valid ISO date", () => {
    expect(IsoDateSchema.safeParse("2026-09-15").success).toBe(true);
  });

  it("accepts Feb 29 on a leap year", () => {
    expect(IsoDateSchema.safeParse("2028-02-29").success).toBe(true);
  });

  it.each([
    ["2026-2-5", "missing zero-padding"],
    ["15-09-2026", "wrong field order"],
    ["2026/09/15", "wrong separator"],
    ["2026-09-15T00:00:00Z", "datetime instead of date"],
    ["", "empty string"],
  ])("rejects %s (%s)", (value) => {
    expect(IsoDateSchema.safeParse(value).success).toBe(false);
  });

  it.each([
    ["2026-02-30", "Feb 30 never exists"],
    ["2026-02-29", "2026 is not a leap year"],
    ["2026-13-01", "month 13"],
    ["2026-00-10", "month 00"],
    ["2026-04-31", "April has 30 days"],
    ["2026-06-00", "day 00"],
  ])("rejects impossible calendar date %s (%s)", (value) => {
    expect(IsoDateSchema.safeParse(value).success).toBe(false);
  });
});

describe("TimeSchema", () => {
  it.each(["00:00", "09:05", "12:30", "23:59"])("accepts %s", (value) => {
    expect(TimeSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ["24:00", "hour out of range"],
    ["12:60", "minute out of range"],
    ["9:05", "missing zero-padding"],
    ["23:59:59", "seconds not supported"],
    ["11:59 PM", "12-hour format"],
    ["", "empty string"],
  ])("rejects %s (%s)", (value) => {
    expect(TimeSchema.safeParse(value).success).toBe(false);
  });
});

describe("GeminiDeadlineSchema", () => {
  it("accepts a fully valid deadline", () => {
    expect(GeminiDeadlineSchema.safeParse(validExtracted).success).toBe(true);
  });

  it("accepts an all-day deadline (no time) with no notes", () => {
    const { time: _t, notes: _n, ...rest } = validExtracted;
    expect(GeminiDeadlineSchema.safeParse(rest).success).toBe(true);
  });

  it("trims surrounding whitespace on text fields", () => {
    const parsed = GeminiDeadlineSchema.parse({
      ...validExtracted,
      courseName: "  BIO 101  ",
      title: "\tMidterm Exam 1\n",
    });
    expect(parsed.courseName).toBe("BIO 101");
    expect(parsed.title).toBe("Midterm Exam 1");
  });

  it("rejects a title that is only whitespace", () => {
    const result = GeminiDeadlineSchema.safeParse({
      ...validExtracted,
      title: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown deadline type", () => {
    const result = GeminiDeadlineSchema.safeParse({
      ...validExtracted,
      type: "homework", // LLMs love inventing enum values
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown confidence value", () => {
    const result = GeminiDeadlineSchema.safeParse({
      ...validExtracted,
      confidence: "medium",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    for (const key of ["courseName", "title", "date", "type", "confidence"]) {
      const clone: Record<string, unknown> = { ...validExtracted };
      delete clone[key];
      expect(GeminiDeadlineSchema.safeParse(clone).success, key).toBe(false);
    }
  });

  it("rejects an id field sneaking in from the model", () => {
    // Contract: Gemini output must NOT carry ids; strict object would be
    // overkill (Gemini may add harmless extras), but id specifically must
    // never pass through into DeadlineSchema unvalidated.
    const parsed = GeminiDeadlineSchema.parse({
      ...validExtracted,
      id: "model-made-this-up",
    });
    expect("id" in parsed).toBe(false); // stripped by default zod behavior
  });
});

describe("DeadlineSchema", () => {
  it("accepts a deadline with a uuid", () => {
    const result = DeadlineSchema.safeParse({
      ...validExtracted,
      id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = DeadlineSchema.safeParse({
      ...validExtracted,
      id: "deadline-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("ExtractionResultSchema", () => {
  it("accepts a valid envelope", () => {
    const result = ExtractionResultSchema.safeParse({
      courseName: "BIO 101",
      deadlines: [validExtracted],
      warnings: ["Could not resolve 'Week 3 Friday' — no anchor date"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty deadlines array (non-syllabus PDF case)", () => {
    const result = ExtractionResultSchema.safeParse({
      courseName: "Unknown Course",
      deadlines: [],
      warnings: [],
    });
    expect(result.success).toBe(true);
  });

  it("defaults warnings to [] when omitted", () => {
    const parsed = ExtractionResultSchema.parse({
      courseName: "BIO 101",
      deadlines: [validExtracted],
    });
    expect(parsed.warnings).toEqual([]);
  });

  it("rejects when one deadline in the array is invalid", () => {
    const result = ExtractionResultSchema.safeParse({
      courseName: "BIO 101",
      deadlines: [validExtracted, { ...validExtracted, date: "next Friday" }],
      warnings: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("toDeadline", () => {
  it("attaches a valid uuid and preserves all fields", () => {
    const deadline = toDeadline(validExtracted);
    expect(DeadlineSchema.safeParse(deadline).success).toBe(true);
    expect(deadline).toMatchObject(validExtracted);
  });

  it("uses the provided id when given", () => {
    const id = "8f14e45f-ceea-467f-a0e6-b52d17c1e4a2";
    expect(toDeadline(validExtracted, id).id).toBe(id);
  });

  it("generates unique ids across calls", () => {
    const a = toDeadline(validExtracted);
    const b = toDeadline(validExtracted);
    expect(a.id).not.toBe(b.id);
  });
});
