/**
 * lib/gemini.ts — Gemini client, extraction prompt v2, response validation.
 *
 * CAVEAT: the Gemini JS SDK (@google/genai) and its request/response shape
 * move quickly, and this sandbox has no network path to
 * generativelanguage.googleapis.com — so the SDK call below (model name,
 * the `config` object shape, `response.text`) is written to the best current
 * documentation but has NOT been exercised against the live API. Everything
 * else here (prompt, error taxonomy, JSON parsing, Zod validation) IS unit
 * tested with a mocked Gemini call. Verify the call site against
 * https://ai.google.dev/gemini-api/docs once a real GEMINI_API_KEY is available
 * — that's the one place a live-docs drift could bite.
 *
 * PROMPT v2 (Step 7): hardened by reasoning about likely real-syllabus
 * patterns (see STATUS.md), NOT by testing against real syllabi — this
 * sandbox has no real API key and no sample syllabus PDFs. Treat this as a
 * best-effort pass; re-tune once real failures are observed.
 */

import { GoogleGenAI } from "@google/genai";
import { ExtractionResultSchema, type ExtractionResult } from "./types";

// Using the auto-updating alias, not a pinned dated model — a pinned
// "gemini-2.5-flash" was confirmed LIVE (2026-07-11) to return 404 "no
// longer available to new users" well before its officially announced
// shutdown date. Google commits to 2 weeks' email notice before swapping
// what this alias points to, which is more resilient than a hard pin that
// can vanish without warning. Currently resolves to gemini-3.5-flash.
const GEMINI_MODEL = "gemini-flash-latest";

/** System instruction per PROJECT_PLAN §4. Versioned here — this is v2 (Step 7). */
export function buildExtractionPrompt(today: string = new Date().toISOString().slice(0, 10)): string {
  return `
You are extracting deadlines from a college or high school course syllabus PDF.

Read the entire document and extract every dated item: exams, quizzes,
assignments, projects (and their milestones), graded readings, presentations,
and no-class days (holidays, breaks, cancelled sessions).

Use exactly one of these six "type" values for every item — map anything
that isn't an obvious exam/quiz/assignment/project/reading to "other"
(this includes no-class days, holidays, and miscellaneous presentations):
exam, quiz, assignment, project, reading, other.

Rules:
- Never invent a date. Only extract a date that is stated outright, or that
  can be resolved from an explicit anchor in the document (e.g. "Week 3
  Friday" is only resolvable if the syllabus states which calendar date
  Week 1 starts). If a date cannot be resolved this way — including dates
  marked "TBD" or "to be announced" — omit that item and add a short note
  about it to "warnings" instead.
- Assume month/day order for numeric dates like "9/15" unless the document's
  own conventions clearly indicate day/month.
- If a date has no explicit year, assume the next upcoming occurrence of
  that month/day relative to today (${today}), and set confidence to "low".
- Confidence describes certainty about the DATE specifically, not the entry
  as a whole: "high" only when the date is stated or resolvable with no
  inference; "low" for any inferred year or resolved relative date.
- A project with multiple checkpoints (proposal, draft, final, presentation)
  gets one entry per checkpoint, each with its own date, titled to
  distinguish them, e.g. "Group Project — Proposal", "Group Project — Final".
- "time" is optional: include only a 24-hour "HH:MM" if the syllabus states a
  clock time; omit it entirely for all-day/date-only items.
- "notes" is optional: short context only (room, weight %, "extra credit /
  optional", etc.) — not a restatement of the title.
- If the PDF has no dated items at all (e.g. it isn't a syllabus), return an
  empty "deadlines" array rather than guessing.

Respond with ONLY raw JSON, no markdown code fences and no commentary before
or after it, in exactly this shape:
{
  "courseName": string,
  "deadlines": [
    {
      "courseName": string,
      "title": string,
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "type": "exam" | "assignment" | "quiz" | "project" | "reading" | "other",
      "notes": string,
      "confidence": "high" | "low"
    }
  ],
  "warnings": string[]
}
`.trim();
}

export type ExtractionError =
  | { type: "bad_pdf"; message: string }
  | { type: "api_error"; message: string }
  | { type: "empty_result"; message: string }
  | { type: "invalid_response"; message: string }
  | { type: "timeout"; message: string };

export type ExtractionOutcome =
  | { success: true; result: ExtractionResult }
  | { success: false; error: ExtractionError };

/**
 * Best-effort recovery of a JSON payload from model output that may include
 * a code fence, or — despite instructions — surrounding commentary. Falls
 * back through: fenced block -> first-brace..last-brace slice -> raw text.
 */
function extractJsonPayload(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text.trim();
}

/** Best-effort classification of a thrown SDK error. Refine in Step 7 once
 *  real failure messages have been observed against the live API. */
function classifyThrownError(err: unknown): ExtractionError {
  const message = err instanceof Error ? err.message : "Gemini request failed.";
  const lower = message.toLowerCase();
  if (lower.includes("mime") || lower.includes("unsupported") || lower.includes("invalid") && lower.includes("file")) {
    return { type: "bad_pdf", message };
  }
  return { type: "api_error", message };
}

// Step 14a: no request should hang the UI forever. 30s balances "don't kill
// a normal-length syllabus mid-extraction" against "don't leave the user
// staring at a spinner indefinitely."
const GEMINI_TIMEOUT_MS = 30_000;
const TIMEOUT_SENTINEL = "__GEMINI_CALL_TIMEOUT__";

/**
 * Races a promise against a timer. HONEST LIMITATION: this abandons the
 * client-side wait, it does not confirm the underlying Gemini request was
 * actually cancelled (uncertain whether @google/genai's generateContent
 * honors an AbortSignal — unverifiable without live API access, see file
 * header). The user gets a fast, friendly timeout either way; the
 * in-flight request may still complete server-side and simply be ignored.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(TIMEOUT_SENTINEL)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * The actual network call, isolated so tests can inject a fake instead of
 * hitting the real API. This is the one function that needs re-verifying
 * against live Gemini docs (see file header).
 */
export async function callGemini(apiKey: string, base64Pdf: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: "application/pdf", data: base64Pdf } }],
      },
    ],
    config: {
      systemInstruction: buildExtractionPrompt(),
      responseMimeType: "application/json",
      // Headroom for syllabi with many deadlines; truncated JSON is a
      // realistic failure mode this can't be live-tested against yet.
      maxOutputTokens: 8192,
    },
  });
  return response.text ?? "";
}

/**
 * Extracts deadlines from a syllabus PDF via Gemini. Never throws for
 * expected failure modes — every branch returns a typed ExtractionOutcome
 * so app/api/extract/route.ts can map errors to clean HTTP responses.
 */
export async function extractDeadlinesFromPdf(
  file: File,
  deps: { callGemini?: typeof callGemini } = {}
): Promise<ExtractionOutcome> {
  const geminiCall = deps.callGemini ?? callGemini;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: { type: "api_error", message: "Gemini API key is not configured on the server." },
    };
  }

  let base64Pdf: string;
  try {
    const bytes = await file.arrayBuffer();
    base64Pdf = Buffer.from(bytes).toString("base64");
  } catch {
    return { success: false, error: { type: "bad_pdf", message: "Could not read the uploaded PDF." } };
  }

  let responseText: string;
  try {
    responseText = await withTimeout(geminiCall(apiKey, base64Pdf), GEMINI_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof Error && err.message === TIMEOUT_SENTINEL) {
      return {
        success: false,
        error: { type: "timeout", message: `Gemini did not respond within ${GEMINI_TIMEOUT_MS / 1000}s.` },
      };
    }
    return { success: false, error: classifyThrownError(err) };
  }

  if (!responseText.trim()) {
    return {
      success: false,
      error: { type: "empty_result", message: "Gemini returned an empty response." },
    };
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(extractJsonPayload(responseText));
  } catch {
    return {
      success: false,
      error: { type: "invalid_response", message: "Gemini's response was not valid JSON." },
    };
  }

  const parsed = ExtractionResultSchema.safeParse(rawJson);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        type: "invalid_response",
        message: `Gemini's response didn't match the expected schema: ${parsed.error.message}`,
      },
    };
  }

  return { success: true, result: parsed.data };
}
