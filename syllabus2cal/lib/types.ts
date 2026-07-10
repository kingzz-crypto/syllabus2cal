/**
 * lib/types.ts — Single source of truth for the data contract.
 *
 * Per PROJECT_PLAN §3/§7: every other module (Gemini extraction, the review
 * table, the ICS builder) depends on these types. If a spec conflict arises,
 * this file wins — propose changes here rather than diverging elsewhere.
 *
 * Two schema "shapes" exist on purpose:
 *   - GeminiDeadlineSchema: what the AI returns (no `id` — the model must
 *     never be trusted to generate stable identifiers).
 *   - DeadlineSchema: the full client-side shape (id added after validation).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const DEADLINE_TYPES = [
  "exam",
  "assignment",
  "quiz",
  "project",
  "reading",
  "other",
] as const;

export const DeadlineTypeSchema = z.enum(DEADLINE_TYPES);
export type DeadlineType = z.infer<typeof DeadlineTypeSchema>;

export const ConfidenceSchema = z.enum(["high", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

// ---------------------------------------------------------------------------
// Date / time primitives
// ---------------------------------------------------------------------------

/**
 * Strict ISO 8601 calendar date, e.g. "2026-09-15".
 * Regex catches shape; the refine catches impossible dates like 2026-02-30
 * (Date.UTC would silently roll those over to March, so we round-trip check).
 */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(isRealCalendarDate, "Date does not exist on the calendar");

/** 24-hour wall-clock time, e.g. "23:59". Seconds intentionally unsupported. */
export const TimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in 24-hour HH:MM format");

function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// ---------------------------------------------------------------------------
// Deadline
// ---------------------------------------------------------------------------

/**
 * Shape produced by the extraction model — everything except `id`.
 * Text fields are trimmed; empty-after-trim titles/course names are rejected
 * because a deadline you can't name is a deadline you can't review.
 */
export const GeminiDeadlineSchema = z.object({
  courseName: z.string().trim().min(1, "courseName must not be empty").max(200),
  title: z.string().trim().min(1, "title must not be empty").max(300),
  date: IsoDateSchema,
  time: TimeSchema.optional(),
  type: DeadlineTypeSchema,
  notes: z.string().trim().max(1000).optional(),
  confidence: ConfidenceSchema,
});
export type GeminiDeadline = z.infer<typeof GeminiDeadlineSchema>;

/** Full client-side deadline: extraction output + client-generated uuid. */
export const DeadlineSchema = GeminiDeadlineSchema.extend({
  id: z.uuid("id must be a UUID"),
});
export type Deadline = z.infer<typeof DeadlineSchema>;

// ---------------------------------------------------------------------------
// Extraction result (Gemini response envelope, per PROJECT_PLAN §4)
// ---------------------------------------------------------------------------

/**
 * The envelope the extraction API validates before anything reaches the
 * client. `warnings` carries non-fatal issues (e.g. relative dates that
 * couldn't be resolved) — no date is ever silently dropped.
 */
export const ExtractionResultSchema = z.object({
  courseName: z.string().trim().min(1).max(200),
  deadlines: z.array(GeminiDeadlineSchema),
  warnings: z.array(z.string()).default([]),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Promote a validated extraction deadline to a full client Deadline by
 * attaching a uuid. Kept here (not in a component) so the id strategy has
 * exactly one home.
 */
export function toDeadline(
  extracted: GeminiDeadline,
  id: string = crypto.randomUUID()
): Deadline {
  return { ...extracted, id };
}
