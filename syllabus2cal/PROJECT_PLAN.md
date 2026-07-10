# Syllabus2Cal — Master Project Plan & Build Spec
*Version 1.0 — Living document. Any AI or human continuing this project MUST read this file first, then STATUS.md for current progress.*

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

System instruction (tune during Step 6, keep versioned in `lib/gemini.ts`):
- Extract ALL dated items: exams, quizzes, assignments, projects, readings, presentations, no-class days.
- Output strict JSON array matching the Deadline schema (minus `id`).
- Resolve relative dates ("Week 3 Friday") only when the syllabus provides an anchor; otherwise omit and report in a `warnings` array.
- Never invent dates. Mark inferred years as low confidence.
- Response format: `{ "courseName": string, "deadlines": [...], "warnings": string[] }`

---

## 5. Incremental Build Roadmap (one step ≈ one session, ~2–5% each)

Rules: implement ONLY the current step. Each step ends with: (a) what was done, (b) what was left out, (c) next step. Update STATUS.md.

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
8. `DeadlineTable`: render results, highlight low-confidence rows
9. Table editing: inline edit title/date/time/type, delete row, add row
10. `lib/icsBuilder.ts`: pure function Deadline[] → ics string; unit tests (all-day events, timed events, timezone handling — use floating local times)
11. `POST /api/ics` + `DownloadButton`: download .ics; verify import into Google Calendar AND Apple Calendar

**Phase D — Monetization & Polish**
12. `lib/usage.ts` + `PaywallModal`: localStorage counter, free = 1 syllabus, modal with PayPal link + manual unlock code input
13. Unlock code mechanism: static codes validated client-side v1 (`SHA-256 hash check`), documented upgrade path to server-side later
14. Error/empty/loading states polish: friendly copy for every failure mode
15. Mobile responsiveness pass (most students will arrive from TikTok on phones — critical)

**Phase E — Launch**
16. Analytics: Vercel Analytics + Clarity snippet; define funnel events (upload_started, extract_success, ics_downloaded, paywall_shown, unlocked)
17. SEO + meta: title/OG tags, social share image, favicon
18. End-to-end QA with 10 real syllabi; fix top issues; write LAUNCH_CHECKLIST.md
19. Launch: post Shorts + Reddit + Discord (marketing plan in first-revenue-app-plan.md)
20. Post-launch: watch Clarity, fix top 3 friction points

---

## 6. Quality Standards (every step)

- TypeScript strict mode; no `any` unless justified in a comment
- Pure logic gets unit tests; UI gets manual test checklist in the step summary
- Handle: empty PDF, scanned PDF, non-syllabus PDF, no dates found, Gemini timeout/quota, malformed JSON
- Small files (<150 lines where possible), single responsibility
- Comments explain *why*, not *what*

## 7. Handoff Protocol (for any AI continuing this project)

1. Read this file fully, then `STATUS.md` (current step, decisions log, known issues).
2. Implement only the current step. Do not refactor unrelated code without approval.
3. After each step append to STATUS.md: step #, date, done, left out, assumptions, next step.
4. If a spec conflict arises, the types in `lib/types.ts` win; propose changes rather than silently diverging.
