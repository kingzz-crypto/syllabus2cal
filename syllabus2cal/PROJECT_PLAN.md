# Syllabus2Cal — Master Project Plan & Build Spec
*Version 1.1 — Living document. Any AI or human continuing this project MUST read this file first, then STATUS.md for current progress.*
*Changelog v1.1: Steps 8–20 split into half-steps (a/b) to keep each build session small and token-cheap. Steps 1–7 unchanged.*
*v1.1 refinement (Claude Sonnet 5, 2026-07-11): tightened 8a–10b for precision before building starts on them — see STATUS.md for the specific additions/decisions (client↔API wiring placement, edit-validation behavior, confidence-on-edit rule, icsBuilder library choice, a floating-time risk to verify). 11a onward left as drafted — out of scope for this pass.*

---

## 1. Product Definition

**One-liner:** Upload a syllabus PDF → AI extracts every deadline → download an .ics calendar file that imports into Google/Apple/Outlook Calendar.

**Target user:** College/university students (secondary: high school students with class schedules).

**Core promise:** "Never miss a deadline. 30 seconds per syllabus."

**Business model:**
- Free: 1 syllabus per user
- Paid ($4 one-time via PayPal link, brother's account): unlimited syllabi + merge all courses into one calendar

**Explicit NON-goals for v1 (do not build unless asked):**
- No user accounts/auth (use browser localStorage for free-tier tracking)
- No mobile app, no reminders/notifications, no Google Calendar API sync (ICS file only)
- No syllabus editing/storage backend, no team features, no dark-pattern upsells

---

## 2. Tech Stack (all free tier)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript** | Frontend + API routes in one deployable unit; free on Vercel |
| Styling | **Tailwind CSS** | Fast, AI-friendly, no design system needed |
| AI extraction | **Google Gemini API (gemini-2.0-flash or newer, free tier)** | Accepts PDFs natively (no separate PDF parser needed), generous free quota |
| PDF fallback parse | `pdf-parse` or `unpdf` (text extraction) only if Gemini file upload fails | Keep as fallback, not primary |
| ICS generation | **`ics` npm package** | Battle-tested, RFC 5545 compliant |
| Hosting | **Vercel free tier** | Zero config, HTTPS, serverless API routes |
| Payments | **PayPal.me link / PayPal button** (brother's account) | Zero code v1; unlock code sent manually at first, automate later |
| Analytics | **Vercel Analytics + Microsoft Clarity** | Both free |
| State/storage | Browser **localStorage** only | No DB in v1 |

**Environment variables:** `GEMINI_API_KEY` (server-side only, never exposed to client).

---

## 3. Architecture

```
/app
  /page.tsx              → Landing + upload UI (single page app feel)
  /api/extract/route.ts  → POST: PDF file → Gemini → JSON deadlines
  /api/ics/route.ts      → POST: JSON deadlines → .ics file download
/components
  UploadDropzone.tsx     → drag-drop + file picker, client component
  DeadlineTable.tsx      → editable results table
  DownloadButton.tsx     → triggers ICS generation + download
  PaywallModal.tsx       → shown on 2nd syllabus attempt
/lib
  gemini.ts              → Gemini client + extraction prompt + response validation
  icsBuilder.ts          → deadlines JSON → ics string (pure function, unit-testable)
  types.ts               → shared TypeScript types (single source of truth)
  usage.ts               → localStorage free-tier counter helpers
/tests                   → unit tests (Vitest) for pure logic (icsBuilder, validation)
```

**Data flow:**
1. Client uploads PDF (max 10 MB) → `POST /api/extract` (multipart)
2. Server sends PDF bytes + extraction prompt to Gemini → gets structured JSON
3. Server validates JSON with Zod schema → returns `Deadline[]` to client
4. Client renders editable table (user fixes AI mistakes — trust-but-verify)
5. Client sends final `Deadline[]` → `POST /api/ics` → returns .ics file → browser download

**Core type (lib/types.ts) — the contract everything depends on:**
```ts
interface Deadline {
  id: string;            // uuid, client-generated
  courseName: string;    // e.g. "BIO 101"
  title: string;         // e.g. "Midterm Exam 1"
  date: string;          // ISO 8601 date: "2026-09-15"
  time?: string;         // "23:59" if specified, else undefined (all-day event)
  type: "exam" | "assignment" | "quiz" | "project" | "reading" | "other";
  notes?: string;        // location, weight %, etc.
  confidence: "high" | "low";  // AI's certainty; low → highlight row for review
}
```

**Key design rules:**
- `icsBuilder.ts` and all validation are **pure functions** — no I/O, fully unit-tested.
- API routes are thin: parse input → call lib function → return. Logic lives in `/lib`.
- Every Gemini response is validated with **Zod**; never trust raw LLM output.
- Ambiguous years: if syllabus lacks a year, assume the upcoming semester relative to current date; flag as `confidence: "low"`.
- No date is silently dropped — extraction failures surface to the user.

---

## 4. Gemini Extraction Prompt (spec)

System instruction (tuned in Step 6/7, versioned in `lib/gemini.ts`):
- Extract ALL dated items: exams, quizzes, assignments, projects, readings, presentations, no-class days.
- Output strict JSON array matching the Deadline schema (minus `id`).
- Resolve relative dates ("Week 3 Friday") only when the syllabus provides an anchor; otherwise omit and report in a `warnings` array.
- Never invent dates. Mark inferred years as low confidence.
- Response format: `{ "courseName": string, "deadlines": [...], "warnings": string[] }`

---

## 5. Incremental Build Roadmap (one step ≈ one session, ~1–3% each)

Rules: implement ONLY the current step. Each step ends with: (a) what was done, (b) what was left out, (c) next step. Update STATUS.md.
**From step 8 onward, each original step is split into two half-steps (a and b). One session = one half-step. Never do both halves in one session.**

**Phase A — Foundation**
1. Scaffold Next.js + TypeScript + Tailwind, deploy "hello world" to Vercel
2. Define `lib/types.ts` (Deadline, ExtractionResult, Zod schemas) + unit test setup (Vitest)
3. Static landing page: headline, value prop, upload placeholder, footer (no logic)

**Phase B — Upload & Extraction**
4. `UploadDropzone` component: drag-drop, file picker, client-side validation (PDF only, ≤10 MB), loading state
5. `POST /api/extract` skeleton: accept multipart PDF, return hardcoded mock `Deadline[]` (contract-first)
6. `lib/gemini.ts`: real Gemini call with PDF, extraction prompt v1, Zod validation, error taxonomy (bad PDF / API down / empty result)
7. Prompt hardening: test against ≥5 real syllabi, iterate prompt, handle scanned/image PDFs (Gemini OCR), document failure modes

**Phase C — Review & Export**
- **8a.** `DeadlineTable` (read-only) **+ minimal real wiring**: on file select, `UploadDropzone` POSTs to `/api/extract` — finally activating the `isLoading` state Step 4 left reserved-but-unused for exactly this moment. Convert each returned `GeminiDeadline` → `Deadline` via `toDeadline()` (Step 2), lift `deadlines: Deadline[]` state into `page.tsx`, pass it to a new `components/DeadlineTable.tsx` that renders title/date/time/type/notes as a clean table. On a failed extraction (400/502), surface the error via UploadDropzone's existing error display (plain message only — polished per-failure-mode copy is Step 14a). No editing, no low-confidence highlighting yet.
  *(Refined vs. the v1.1 draft: "render Deadline[] as a table" didn't say where the data comes from. Without this wiring there is nothing real to render — it's not a new feature, it's the missing plumbing the draft assumed.)*
- **8b.** Low-confidence styling: highlight `confidence: "low"` rows, show `warnings[]` above the table, friendly empty-state message when `deadlines` is `[]`. Same data flow as 8a — no new wiring.
- **9a.** Inline editing: edit **title/date/time/type/notes** in place *(added `notes` — the v1.1 draft's field list omitted it, but it's user-facing data same as the rest)*, each field validated against the Step 2 Zod schemas on commit. Invalid input shows an inline error and does **not** commit — the field keeps its last valid value until fixed.
  **Decision:** editing any field on a `confidence: "low"` row flips it to `"high"` — the user has just confirmed/corrected it. (Flag now if you'd rather it stayed "low".)
- **9b.** Row management: delete row (confirmation dialog first), add a new blank row (defaults: today's date, `type: "other"`, `confidence: "high"` since it's user-authored, not AI-inferred) which is immediately editable via 9a. Keep row keys/ordering stable across add/delete so edits never get misattributed to the wrong row.
- **10a.** `lib/icsBuilder.ts` core, using the **`ics` npm package** (per §2 — not hand-rolled RFC 5545 strings): pure function `Deadline[] → ics string`, **all-day events only**. Unit tests: special-character escaping (commas/semicolons/backslashes/newlines) in title/notes, `UID` derived from `deadline.id` (already a uuid, from Step 2), correct `VCALENDAR`/`VEVENT` wrapper structure.
- **10b.** `icsBuilder` timed events: `time`-bearing deadlines as floating local times (no UTC/timezone conversion — matches Step 2's timezone-naive `TimeSchema`). Edge cases: midnight (`00:00`), a long `notes` field (line-folding), one array mixing all-day + timed events in a single calendar. Unit tests for each.
  **Risk to verify at build time:** some ICS libraries force UTC and don't cleanly support floating local times — confirm `ics`'s API actually supports this before assuming it does; fall back to manual `VEVENT` construction for the time fields if not.
- **11a.** `POST /api/ics` route: validate body with Zod, call icsBuilder, return .ics with correct headers. Test via curl only.
- **11b.** `DownloadButton` component: wire client → API → browser download; manually verify import into Google Calendar AND Apple Calendar.

**Phase D — Monetization & Polish**
- **12a.** `lib/usage.ts`: localStorage free-tier counter (pure helpers + storage wrapper) + unit tests. No UI.
- **12b.** `PaywallModal`: UI shown on 2nd syllabus attempt — PayPal link, unlock-code input field (input not functional yet).
- **13a.** Unlock code logic: client-side SHA-256 hash check as pure functions + unit tests. No wiring.
- **13b.** Wire unlock flow: code input → validate → persist unlocked state in localStorage → paywall bypassed. Document server-side upgrade path.
- **14a.** Error/empty/loading polish for the **upload → extract** flow: friendly copy for every failure mode (bad PDF, timeout, no dates, quota).
- **14b.** Error/empty/loading polish for **table → download → paywall**: download failures, global error fallback, consistent tone.
- **15a.** Mobile responsiveness: landing page + upload flow (most students arrive from TikTok on phones — critical).
- **15b.** Mobile responsiveness: deadline table (scroll/stack strategy), modal, download button.

**Phase E — Launch**
- **16a.** Install Vercel Analytics + Microsoft Clarity snippet; verify both receive data.
- **16b.** Instrument funnel events: upload_started, extract_success, ics_downloaded, paywall_shown, unlocked.
- **17a.** Meta basics: title/description/OG tags + favicon.
- **17b.** Social share image + final SEO pass (verify previews on Twitter/WhatsApp/Discord).
- **18a.** E2E QA round 1: run 5 real syllabi through the full flow; log every issue found (no fixing yet).
- **18b.** E2E QA round 2: 5 more syllabi, fix top issues from both rounds, write LAUNCH_CHECKLIST.md.
- **19a.** Launch prep: draft Shorts script + Reddit + Discord posts (marketing plan in first-revenue-app-plan.md).
- **19b.** Launch: publish posts, monitor day-1 traffic and errors.
- **20a.** Post-launch review: analyze Clarity sessions, identify top 3 friction points.
- **20b.** Fix the top 3 friction points; write post-launch summary in STATUS.md.

---

## 6. Quality Standards (every step)

- TypeScript strict mode; no `any` unless justified in a comment
- Pure logic gets unit tests; UI gets manual test checklist in the step summary
- Handle: empty PDF, scanned PDF, non-syllabus PDF, no dates found, Gemini timeout/quota, malformed JSON
- Small files (<150 lines where possible), single responsibility
- Comments explain *why*, not *what*

## 7. Handoff Protocol (for any AI continuing this project)

1. Read this file fully, then `STATUS.md` (current step, decisions log, known issues).
2. Implement only the current step (one half-step per session from 8a onward). Do not refactor unrelated code without approval.
3. After each step append to STATUS.md: step #, date, done, left out, assumptions, next step.
4. If a spec conflict arises, the types in `lib/types.ts` win; propose changes rather than silently diverging.
