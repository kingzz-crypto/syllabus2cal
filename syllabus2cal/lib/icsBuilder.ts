/**
 * lib/icsBuilder.ts — Deadline[] -> .ics string (Step 10a: all-day, 10b: timed).
 *
 * Pure function, no I/O. Uses the `ics` npm package per PROJECT_PLAN §2
 * rather than hand-rolled RFC 5545 strings.
 *
 * Floating-local-time claim is verified, not assumed: `startInputType` /
 * `startOutputType: "local"` was tested by generating the same event under
 * TZ=America/Los_Angeles and TZ=Asia/Kolkata — byte-identical DTSTART output
 * with no "Z" suffix and no TZID in both. That's what PROJECT_PLAN's
 * "floating local times" requirement needs (see STATUS.md for the probe).
 */

import { createEvents, type EventAttributes } from "ics";
import type { Deadline, DeadlineType } from "./types";

const TYPE_LABELS: Record<DeadlineType, string> = {
  exam: "Exam",
  quiz: "Quiz",
  assignment: "Assignment",
  project: "Project",
  reading: "Reading",
  other: "Other",
};

/**
 * Nominal duration for a timed (point-in-time) deadline. A Deadline has no
 * end time of its own -- it's a due date, not a meeting -- but a 0-minute
 * block renders oddly in some calendar apps, so give it a small visible
 * window instead. Not specified in PROJECT_PLAN; documented here as a
 * deliberate default rather than left implicit.
 */
const TIMED_EVENT_DURATION_MINUTES = 30;

function buildTitle(deadline: Deadline): string {
  return deadline.courseName ? `${deadline.courseName}: ${deadline.title}` : deadline.title;
}

function deadlineToEvent(deadline: Deadline): EventAttributes {
  const [year, month, day] = deadline.date.split("-").map(Number);
  const shared = {
    uid: `${deadline.id}@syllabus2cal`,
    title: buildTitle(deadline),
    categories: [TYPE_LABELS[deadline.type]],
    ...(deadline.notes ? { description: deadline.notes } : {}),
  };

  if (deadline.time) {
    const [hour, minute] = deadline.time.split(":").map(Number);
    return {
      ...shared,
      start: [year, month, day, hour, minute],
      startInputType: "local",
      startOutputType: "local",
      duration: { minutes: TIMED_EVENT_DURATION_MINUTES },
    };
  }

  return {
    ...shared,
    start: [year, month, day],
    duration: { days: 1 },
  };
}

export type IcsBuildResult = { success: true; ics: string } | { success: false; error: string };

/**
 * Builds one complete .ics calendar from a list of deadlines. All-day
 * (no `time`) and timed (floating local time) deadlines can be freely mixed
 * in the same array -- each is mapped independently.
 */
export function buildIcs(deadlines: Deadline[]): IcsBuildResult {
  const events = deadlines.map(deadlineToEvent);
  const calName = deadlines[0]?.courseName || "Syllabus2Cal";

  const { error, value } = createEvents(events, {
    productId: "-//Syllabus2Cal//EN",
    calName,
  });

  if (error || !value) {
    return { success: false, error: error?.message ?? "Failed to generate calendar file." };
  }
  return { success: true, ics: value };
}

/**
 * Download filename derived from the first deadline's course name (Step
 * 11a), sanitized to safe filesystem characters. "BIO 101" -> "BIO_101.ics".
 */
export function buildIcsFilename(deadlines: Deadline[]): string {
  const courseName = deadlines[0]?.courseName;
  if (!courseName) return "syllabus2cal.ics";
  const slug = courseName.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug ? `${slug}.ics` : "syllabus2cal.ics";
}
